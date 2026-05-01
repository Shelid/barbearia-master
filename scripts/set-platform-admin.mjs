import { readFileSync } from 'node:fs';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const firebaseConfig = JSON.parse(
  readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8')
);

function getArgument(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function initAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || firebaseConfig.projectId;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

async function main() {
  const uid = getArgument('--uid');
  const email = getArgument('--email');
  const remove = hasFlag('--remove');

  if (!uid && !email) {
    console.error('Use --uid <uid> ou --email <email>.');
    process.exit(1);
  }

  initAdminApp();
  const auth = getAuth();
  const user = uid ? await auth.getUser(uid) : await auth.getUserByEmail(email);
  const currentClaims = { ...(user.customClaims || {}) };

  if (remove) {
    delete currentClaims.platformAdmin;
  } else {
    currentClaims.platformAdmin = true;
  }

  await auth.setCustomUserClaims(user.uid, currentClaims);

  console.log(
    JSON.stringify(
      {
        uid: user.uid,
        email: user.email,
        platformAdmin: !remove,
        claims: currentClaims,
        nextStep: 'Peca ao utilizador para terminar sessao e entrar novamente, ou forcar refresh do ID token.',
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error('Erro ao actualizar custom claims:', error);
  process.exit(1);
});
