import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAppCheck, adminDb } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WAITLIST_RATE_LIMIT_MAX = Number(process.env.WAITLIST_RATE_LIMIT_MAX ?? 3);
const WAITLIST_RATE_LIMIT_WINDOW_SECONDS = Number(process.env.WAITLIST_RATE_LIMIT_WINDOW_SECONDS ?? 600);
const WAITLIST_RATE_LIMIT_WINDOW_MS = WAITLIST_RATE_LIMIT_WINDOW_SECONDS * 1000;
const ENFORCE_APP_CHECK = process.env.FIREBASE_APP_CHECK_ENFORCE === 'true';
const CONSUME_APP_CHECK = process.env.FIREBASE_APP_CHECK_CONSUME === 'true';
const RATE_LIMIT_SECRET =
  process.env.WAITLIST_RATE_LIMIT_SECRET ||
  process.env.FIREBASE_ADMIN_PROJECT_ID ||
  'barberflow-waitlist-pepper';

type WaitlistPayload = {
  shopId: string;
  clientName: string;
  clientPhone: string;
  preferredDate: string;
  barberId: string;
  website?: string;
};

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, '').slice(0, 30);
}

function getAllowedOrigins() {
  const fromEnv = (process.env.WAITLIST_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.APP_URL,
    ...fromEnv,
  ].filter(Boolean) as string[]);
}

function isAllowedOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) {
    return true;
  }

  return getAllowedOrigins().has(origin);
}

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]!.trim();
  }

  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

function hashFingerprint(shopId: string, ip: string, userAgent: string) {
  return createHash('sha256')
    .update(`${RATE_LIMIT_SECRET}|${shopId}|${ip}|${userAgent}`)
    .digest('hex');
}

function validatePayload(raw: unknown): { ok: true; data: WaitlistPayload } | { ok: false; message: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, message: 'Solicitud invalida.' };
  }

  const payload = raw as Record<string, unknown>;
  const shopId = normalizeString(payload.shopId);
  const clientName = normalizeString(payload.clientName);
  const clientPhone = normalizePhone(normalizeString(payload.clientPhone));
  const preferredDate = normalizeString(payload.preferredDate);
  const barberId = normalizeString(payload.barberId) || 'any';
  const website = normalizeString(payload.website);

  if (website) {
    return { ok: false, message: 'Solicitud rechazada.' };
  }

  if (!shopId || shopId.length > 120) {
    return { ok: false, message: 'Barberia invalida.' };
  }

  if (clientName.length < 2 || clientName.length > 120) {
    return { ok: false, message: 'Escribe un nombre valido.' };
  }

  if (clientPhone.length < 6 || clientPhone.length > 30) {
    return { ok: false, message: 'Escribe un telefono valido.' };
  }

  if (!isValidDateOnly(preferredDate)) {
    return { ok: false, message: 'Fecha invalida.' };
  }

  if (!barberId || barberId.length > 120) {
    return { ok: false, message: 'Barbero invalido.' };
  }

  return {
    ok: true,
    data: {
      shopId,
      clientName,
      clientPhone,
      preferredDate,
      barberId,
      website,
    },
  };
}

async function verifyAppCheck(req: NextRequest) {
  const token = req.headers.get('x-firebase-appcheck');

  if (!token) {
    if (ENFORCE_APP_CHECK) {
      throw new Error('APP_CHECK_REQUIRED');
    }

    return { verified: false, appId: null as string | null };
  }

  const response = await adminAppCheck.verifyToken(token, { consume: CONSUME_APP_CHECK });
  if (response.alreadyConsumed) {
    throw new Error('APP_CHECK_REPLAY');
  }

  return {
    verified: true,
    appId: response.appId,
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!isAllowedOrigin(req)) {
      return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
    }

    const parsed = validatePayload(await req.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.message }, { status: 400 });
    }

    const { shopId, clientName, clientPhone, preferredDate, barberId } = parsed.data;
    const appCheck = await verifyAppCheck(req);

    const shopRef = adminDb.collection('barbershops').doc(shopId);
    const shopSnap = await shopRef.get();
    if (!shopSnap.exists || shopSnap.data()?.active === false) {
      return NextResponse.json({ error: 'Barberia no disponible.' }, { status: 404 });
    }

    if (barberId !== 'any') {
      const barberSnap = await shopRef.collection('barbers').doc(barberId).get();
      if (!barberSnap.exists || barberSnap.data()?.active === false) {
        return NextResponse.json({ error: 'Barbero no disponible.' }, { status: 400 });
      }
    }

    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const identifierHash = hashFingerprint(shopId, ip, userAgent);
    const rateLimitRef = adminDb.collection('_internal_rate_limits').doc(`waitlist_${shopId}_${identifierHash}`);
    const waitlistRef = shopRef.collection('waitlist').doc();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    try {
      await adminDb.runTransaction(async (transaction) => {
        const rateLimitSnap = await transaction.get(rateLimitRef);
        const current = rateLimitSnap.exists
          ? (rateLimitSnap.data() as { count?: number; windowStartedAt?: string } | undefined)
          : undefined;

        let count = 1;
        let windowStartedAt = nowIso;

        if (current?.windowStartedAt) {
          const windowStartedAtMs = Date.parse(current.windowStartedAt);
          const insideWindow = Number.isFinite(windowStartedAtMs) && nowMs - windowStartedAtMs < WAITLIST_RATE_LIMIT_WINDOW_MS;

          if (insideWindow) {
            count = (current.count || 0) + 1;
            windowStartedAt = current.windowStartedAt;
          }
        }

        if (count > WAITLIST_RATE_LIMIT_MAX) {
          throw new Error('RATE_LIMITED');
        }

        transaction.set(rateLimitRef, {
          scope: 'waitlist',
          shopId,
          identifierHash,
          count,
          windowStartedAt,
          updatedAt: nowIso,
          expiresAt: Timestamp.fromMillis(nowMs + WAITLIST_RATE_LIMIT_WINDOW_MS),
        }, { merge: true });

        transaction.set(waitlistRef, {
          clientName,
          clientPhone,
          preferredDate,
          barberId,
          createdAt: nowIso,
          serverCreatedAt: FieldValue.serverTimestamp(),
          source: 'public_waitlist_api',
          appCheckVerified: appCheck.verified,
          appCheckAppId: appCheck.appId,
          requestFingerprintHash: identifierHash,
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'RATE_LIMITED') {
        return NextResponse.json(
          { error: 'Has enviado demasiadas solicitudes. Intentalo de nuevo en unos minutos.' },
          { status: 429 }
        );
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'APP_CHECK_REQUIRED') {
        return NextResponse.json({ error: 'Falta validacion de seguridad.' }, { status: 401 });
      }

      if (error.message === 'APP_CHECK_REPLAY') {
        return NextResponse.json({ error: 'Solicitud repetida bloqueada.' }, { status: 401 });
      }
    }

    console.error('Waitlist API error:', error);
    return NextResponse.json({ error: 'No fue posible unirte a la lista ahora mismo.' }, { status: 500 });
  }
}
