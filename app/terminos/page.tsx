import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/legal/LegalPageShell';
import { LEGAL_LAST_UPDATED, LEGAL_PRODUCTION_NOTICE, LEGAL_SERVICE_NAME } from '@/lib/legal';

export const metadata: Metadata = {
  title: `Terminos | ${LEGAL_SERVICE_NAME}`,
  description: 'Terminos y condiciones de uso de BarberFlow Spain.',
};

export default function TermsPage() {
  const sections = [
    {
      id: 'objeto',
      title: 'Objeto del servicio',
      content: (
        <>
          <p>
            {LEGAL_SERVICE_NAME} es una plataforma digital orientada a la gestion de barberias y a la reserva de citas por parte de clientes.
            El servicio puede incluir funcionalidades de registro, autenticacion, agenda, configuracion de barberia, reseñas, localizacion y enlaces externos de navegacion.
          </p>
          <p>
            El uso de la plataforma implica la aceptacion de estos terminos, de la politica de privacidad y de la politica de cookies.
          </p>
        </>
      ),
    },
    {
      id: 'roles',
      title: 'Tipos de usuario y responsabilidades',
      content: (
        <>
          <ul>
            <li>
              <strong>Clientes:</strong> pueden crear o utilizar una cuenta para reservar servicios, consultar barberias y, cuando corresponda, dejar reseñas verificadas.
            </li>
            <li>
              <strong>Barberias / administradores:</strong> gestionan su propia ficha, horarios, barberos, servicios, reservas, galeria y localizacion exacta.
            </li>
          </ul>
          <p>
            Cada barberia es responsable de que la informacion que publique sea veraz, actualizada y conforme a la normativa aplicable, incluida la de proteccion de datos, consumo y publicidad.
          </p>
        </>
      ),
    },
    {
      id: 'registro',
      title: 'Registro, acceso y seguridad de la cuenta',
      content: (
        <>
          <p>
            El usuario se compromete a facilitar datos exactos, completos y actualizados. El acceso puede realizarse mediante credenciales propias o, cuando la plataforma lo permita, mediante proveedores externos como Google.
          </p>
          <p>
            Cada usuario es responsable de custodiar sus credenciales, evitar accesos no autorizados y comunicar cualquier incidencia de seguridad de la que tenga conocimiento.
          </p>
          <p>
            La plataforma podra suspender temporalmente cuentas o accesos cuando existan indicios razonables de fraude, uso abusivo, vulneracion de seguridad o incumplimiento grave de estos terminos.
          </p>
        </>
      ),
    },
    {
      id: 'uso',
      title: 'Reglas de uso aceptable',
      content: (
        <>
          <p>No esta permitido utilizar el servicio para:</p>
          <ul>
            <li>Suplantar identidades o crear cuentas con datos falsos.</li>
            <li>Acceder a barberias, reservas o datos de terceros sin autorizacion.</li>
            <li>Introducir codigo malicioso, automatizaciones abusivas o acciones orientadas a degradar el servicio.</li>
            <li>Publicar contenidos ilicitos, ofensivos, discriminatorios, fraudulentos o que lesionen derechos de terceros.</li>
            <li>Usar la plataforma de forma contraria a la normativa de proteccion de datos, competencia, consumo o propiedad intelectual.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'reservas',
      title: 'Reservas, reseñas y contenidos',
      content: (
        <>
          <p>
            Las reservas generadas a traves de la plataforma dependen de la configuracion operativa de cada barberia. La barberia es responsable de la disponibilidad real de sus servicios, horarios, precios y condiciones particulares.
          </p>
          <p>
            Las reseñas solo deben reflejar experiencias autenticas. {LEGAL_SERVICE_NAME} podra moderar, ocultar o retirar reseñas o contenidos cuando detecte fraude, abuso, lenguaje ilicito o riesgo para terceros.
          </p>
        </>
      ),
    },
    {
      id: 'datos',
      title: 'Proteccion de datos y confidencialidad',
      content: (
        <>
          <p>
            El tratamiento de datos personales se rige por la politica de privacidad. Las barberias que operan en la plataforma deben usar los datos de sus clientes solo para finalidades compatibles con la prestacion del servicio contratado y conforme al RGPD.
          </p>
          <p>
            La plataforma aplica reglas de acceso para separar la informacion entre barberias, pero cada responsable debe mantener internamente medidas adicionales de confidencialidad y control de acceso sobre su personal.
          </p>
        </>
      ),
    },
    {
      id: 'disponibilidad',
      title: 'Disponibilidad, cambios y medidas operativas',
      content: (
        <>
          <p>
            {LEGAL_SERVICE_NAME} podra modificar, actualizar o interrumpir funcionalidades por razones tecnicas, de mantenimiento, seguridad, cumplimiento legal o mejora del servicio.
          </p>
          <p>
            La plataforma trabajara para mantener niveles razonables de disponibilidad, pero no garantiza ausencia total de interrupciones, especialmente durante tareas de mantenimiento, incidencias de terceros o medidas urgentes de seguridad.
          </p>
          <p>
            Antes del despliegue productivo general deberan activarse y documentarse medidas complementarias como exportaciones automticas de respaldo, pruebas de reglas de seguridad y limitacion de peticiones en servicios expuestos.
          </p>
        </>
      ),
    },
    {
      id: 'responsabilidad',
      title: 'Responsabilidad',
      content: (
        <>
          <p>
            Salvo en los supuestos en los que la ley disponga lo contrario, {LEGAL_SERVICE_NAME} no sera responsable de:
          </p>
          <ul>
            <li>La informacion comercial, precios, horarios o decisiones operativas adoptadas por cada barberia.</li>
            <li>La actividad de sitios web o servicios de terceros enlazados desde la plataforma.</li>
            <li>Interrupciones causadas por proveedores externos, redes de comunicaciones o fuerza mayor.</li>
          </ul>
          <p>
            Nada de lo anterior limita los derechos irrenunciables de consumidores y usuarios cuando resulten aplicables.
          </p>
        </>
      ),
    },
    {
      id: 'ley',
      title: 'Ley aplicable y reclamaciones',
      content: (
        <>
          <p>
            Estos terminos se interpretaran conforme al Derecho espanol y, en lo que resulte aplicable, al Derecho de la Union Europea.
          </p>
          <p>
            En materia de proteccion de datos, las personas interesadas podran dirigirse a la Agencia Espanola de Proteccion de Datos.
            En materia de consumo, se respetaran los fueros y derechos imperativos previstos por la normativa aplicable.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalPageShell
      badge="Terminos"
      title="Terminos y condiciones"
      description="Condiciones generales de uso de la plataforma, de las cuentas de usuario y de la operativa entre barberias y clientes."
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={sections}
      notice={
        <p>
          <strong>Nota importante de lanzamiento:</strong> {LEGAL_PRODUCTION_NOTICE}
        </p>
      }
    />
  );
}
