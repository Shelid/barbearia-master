import { after, before, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

const PROJECT_ID = 'barberflow-rules-test';
const RULES = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

let testEnv;

function authedDb(uid, token = {}) {
  return testEnv
    .authenticatedContext(uid, {
      email: `${uid}@example.com`,
      email_verified: true,
      ...token,
    })
    .firestore();
}

async function seedBaseData() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, 'barbershops', 'shopA'), {
      id: 'shopA',
      slug: 'shop-a',
      ownerUid: 'ownerA',
      name: 'Shop A',
      region: 'Asturias',
      city: 'Oviedo',
      active: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'barbershops', 'shopB'), {
      id: 'shopB',
      slug: 'shop-b',
      ownerUid: 'ownerB',
      name: 'Shop B',
      region: 'Asturias',
      city: 'Gijon',
      active: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'users', 'ownerA'), {
      uid: 'ownerA',
      email: 'ownerA@example.com',
      displayName: 'Owner A',
      role: 'admin',
      barbershopId: 'shopA',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'users', 'ownerB'), {
      uid: 'ownerB',
      email: 'ownerB@example.com',
      displayName: 'Owner B',
      role: 'admin',
      barbershopId: 'shopB',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'users', 'client1'), {
      uid: 'client1',
      email: 'client1@example.com',
      displayName: 'Client One',
      role: 'client',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'users', 'client2'), {
      uid: 'client2',
      email: 'client2@example.com',
      displayName: 'Client Two',
      role: 'client',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'barbershops', 'shopA', 'bookings', 'bookingCompleted'), {
      barbershopId: 'shopA',
      barberId: 'barber-1',
      barberName: 'Barber One',
      serviceId: 'service-1',
      serviceName: 'Corte',
      price: 20,
      clientUid: 'client1',
      clientName: 'Client One',
      clientEmail: 'client1@example.com',
      date: '2026-05-10',
      startTime: '10:00',
      status: 'completed',
      reviewed: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'barbershops', 'shopA', 'booked_slots', 'bookingCompleted'), {
      date: '2026-05-10',
      startTime: '10:00',
      barberId: 'barber-1',
      status: 'confirmed',
      bookingId: 'bookingCompleted',
    });

    await setDoc(doc(db, 'barbershops', 'shopB', 'bookings', 'bookingShopB'), {
      barbershopId: 'shopB',
      barberId: 'barber-9',
      barberName: 'Barber Nine',
      serviceId: 'service-9',
      serviceName: 'Barba',
      price: 15,
      clientUid: 'client2',
      clientName: 'Client Two',
      clientEmail: 'client2@example.com',
      date: '2026-05-11',
      startTime: '11:00',
      status: 'pending',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'barbershops', 'shopB', 'booked_slots', 'bookingShopB'), {
      date: '2026-05-11',
      startTime: '11:00',
      barberId: 'barber-9',
      status: 'pending',
      bookingId: 'bookingShopB',
    });
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: RULES,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedBaseData();
});

after(async () => {
  await testEnv.cleanup();
});

test('cliente nao consegue se promover a admin em barbearia alheia', async () => {
  const clientDb = authedDb('client1');

  await assertFails(
    updateDoc(doc(clientDb, 'users', 'client1'), {
      role: 'admin',
      barbershopId: 'shopA',
    })
  );
});

test('cliente pode virar admin apenas da propria barbearia criada por ele', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'barbershops', 'shopClient1'), {
      id: 'shopClient1',
      slug: 'shop-client-1',
      ownerUid: 'client1',
      name: 'Shop Client 1',
      region: 'Asturias',
      city: 'Mieres',
      active: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  const clientDb = authedDb('client1');

  await assertSucceeds(
    setDoc(
      doc(clientDb, 'users', 'client1'),
      {
        role: 'admin',
        barbershopId: 'shopClient1',
      },
      { merge: true }
    )
  );
});

test('admin de uma barbearia nao consegue alterar dados de outra', async () => {
  const ownerADb = authedDb('ownerA');

  await assertSucceeds(
    updateDoc(doc(ownerADb, 'barbershops', 'shopA'), {
      description: 'Atualizacao permitida na propria loja',
    })
  );

  await assertFails(
    updateDoc(doc(ownerADb, 'barbershops', 'shopB'), {
      description: 'Tentativa indevida',
    })
  );
});

test('dados globais de usuarios nao vazam entre clientes nem para barbeiro de outra loja', async () => {
  const clientDb = authedDb('client1');
  const ownerADb = authedDb('ownerA');

  await assertSucceeds(getDoc(doc(clientDb, 'users', 'client1')));
  await assertFails(getDoc(doc(clientDb, 'users', 'client2')));
  await assertFails(getDoc(doc(ownerADb, 'users', 'client2')));
});

test('platform admin por custom claim pode auditar usuarios e gerir lojas', async () => {
  const platformDb = authedDb('platform-root', {
    platformAdmin: true,
  });

  await assertSucceeds(getDoc(doc(platformDb, 'users', 'client2')));
  await assertSucceeds(deleteDoc(doc(platformDb, 'barbershops', 'shopB')));
});

test('cliente so consegue criar reserva propria quando slot bate com o booking do mesmo batch', async () => {
  const clientDb = authedDb('client1');
  const bookingRef = doc(clientDb, 'barbershops', 'shopA', 'bookings', 'bookingNew');
  const slotRef = doc(clientDb, 'barbershops', 'shopA', 'booked_slots', 'bookingNew');

  const batch = writeBatch(clientDb);
  batch.set(bookingRef, {
    barbershopId: 'shopA',
    barberId: 'barber-2',
    barberName: 'Barber Two',
    serviceId: 'service-2',
    serviceName: 'Corte premium',
    price: 25,
    clientUid: 'client1',
    clientName: 'Client One',
    clientEmail: 'client1@example.com',
    date: '2026-05-12',
    startTime: '12:00',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  batch.set(slotRef, {
    date: '2026-05-12',
    startTime: '12:00',
    barberId: 'barber-2',
    status: 'pending',
    bookingId: 'bookingNew',
  });

  await assertSucceeds(batch.commit());

  await assertFails(
    setDoc(doc(clientDb, 'barbershops', 'shopA', 'booked_slots', 'rogueSlot'), {
      date: '2026-05-12',
      startTime: '13:00',
      barberId: 'barber-2',
      status: 'pending',
      bookingId: 'rogueSlot',
    })
  );

  await assertFails(
    updateDoc(doc(clientDb, 'barbershops', 'shopA', 'booked_slots', 'bookingCompleted'), {
      status: 'cancelled',
    })
  );
});

test('review so pode ser criada pelo proprio cliente e junto com a marcacao reviewed da reserva', async () => {
  const clientDb = authedDb('client1');
  const bookingRef = doc(clientDb, 'barbershops', 'shopA', 'bookings', 'bookingCompleted');
  const reviewRef = doc(clientDb, 'barbershops', 'shopA', 'reviews', 'bookingCompleted');

  const validBatch = writeBatch(clientDb);
  validBatch.set(reviewRef, {
    barbershopId: 'shopA',
    bookingId: 'bookingCompleted',
    clientUid: 'client1',
    clientName: 'Client One',
    rating: 5,
    comment: 'Tudo certo',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  validBatch.update(bookingRef, {
    reviewed: true,
  });

  await assertSucceeds(validBatch.commit());

  const client2Db = authedDb('client2');
  await assertFails(
    setDoc(doc(client2Db, 'barbershops', 'shopA', 'reviews', 'bookingCompleted'), {
      barbershopId: 'shopA',
      bookingId: 'bookingCompleted',
      clientUid: 'client2',
      clientName: 'Client Two',
      rating: 1,
      comment: 'Tentativa indevida',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  );
});

test('waitlist publica nao aceita criacao direta pelo cliente no firestore', async () => {
  const clientDb = authedDb('client1');

  await assertFails(
    setDoc(doc(clientDb, 'barbershops', 'shopA', 'waitlist', 'entry1'), {
      clientName: 'Client One',
      clientPhone: '+34600111222',
      preferredDate: '2026-05-12',
      barberId: 'barber-1',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  );
});
