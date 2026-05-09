import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/legal/LegalPageShell';
import { LEGAL_LAST_UPDATED, LEGAL_PRODUCTION_NOTICE, LEGAL_SERVICE_NAME } from '@/lib/legal';

export const metadata: Metadata = {
  title: `Privacidad | ${LEGAL_SERVICE_NAME}`,
  description: 'Politica de privacidad y proteccion de datos de BarberFlow Spain.',
};

export default function PrivacyPage() {
  const sections = [
    {
      id: 'alcance',
      title: 'Alcance y responsables',
      content: (
        <>
          <p>
            Esta politica se aplica al sitio web, al panel de administracion y al flujo de reservas de {LEGAL_SERVICE_NAME}.
            El servicio opera como plataforma digital para barberias y clientes en Espana.
          </p>
          <p>
            En la operativa del servicio pueden existir dos responsables distintos del tratamiento:
          </p>
          <ul>
            <li>
              <strong>BarberFlow Spain</strong>, como responsable de los datos necesarios para crear cuentas, autenticar usuarios,
              operar la plataforma, prevenir abusos y mantener la seguridad del servicio.
            </li>
            <li>
              <strong>Cada barberia registrada</strong>, como responsable independiente de los datos que trate respecto a sus
              clientes, reservas, servicios, reseñas y comunicaciones comerciales propias.
            </li>
          </ul>
          <p>
            Cuando una solicitud se refiera a una reserva concreta o a la relacion directa entre una barberia y su cliente,
            esa solicitud debera dirigirse en primer lugar a la barberia correspondiente. Cuando se refiera al acceso a la
            cuenta, a la seguridad de la plataforma o al funcionamiento general del servicio, debera dirigirse al titular de
            la plataforma.
          </p>
        </>
      ),
    },
    {
      id: 'datos',
      title: 'Datos tratados',
      content: (
        <>
          <p>Segun el uso que se haga de la plataforma, {LEGAL_SERVICE_NAME} puede tratar las siguientes categorias de datos:</p>
          <ul>
            <li>Datos identificativos y de cuenta: nombre, correo electronico, UID de autenticacion y rol del usuario.</li>
            <li>Datos de perfil: telefono, nombre comercial, direccion, ciudad, provincia y descripcion de la barberia.</li>
            <li>Datos de reserva: cliente, barbero, servicio, fecha, hora, precio, estado de la cita y observaciones operativas.</li>
            <li>Datos de reputacion: valoraciones y comentarios publicados por clientes autenticados.</li>
            <li>Datos de localizacion: coordenadas de la barberia y referencias de llegada cuando el administrador las facilita.</li>
            <li>Datos tecnicos y de seguridad: registros de acceso, errores operativos, informacion minima del dispositivo y actividad necesaria para proteger la plataforma.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'finalidades',
      title: 'Finalidades y bases juridicas',
      content: (
        <>
          <p>La siguiente tabla resume las finalidades principales del tratamiento y su base juridica habitual conforme al RGPD:</p>
          <table>
            <thead>
              <tr>
                <th>Finalidad</th>
                <th>Base juridica</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Crear cuentas, autenticar usuarios y mantener sesiones activas.</td>
                <td>Ejecucion de la relacion contractual o medidas precontractuales.</td>
              </tr>
              <tr>
                <td>Gestionar barberias, servicios, barberos, horarios y reservas.</td>
                <td>Ejecucion del contrato y gestion operativa del servicio.</td>
              </tr>
              <tr>
                <td>Permitir el acceso con Google cuando el usuario elige ese metodo.</td>
                <td>Solicitud expresa del interesado y ejecucion del servicio de acceso.</td>
              </tr>
              <tr>
                <td>Guardar la ubicacion exacta de la barberia y mostrar rutas o distancia.</td>
                <td>Accion afirmativa del administrador y, cuando proceda, consentimiento para usar la geolocalizacion del navegador.</td>
              </tr>
              <tr>
                <td>Prevenir fraude, accesos indebidos, abuso del servicio y errores de seguridad.</td>
                <td>Interes legitimo en proteger la plataforma, a los usuarios y la integridad de los datos.</td>
              </tr>
              <tr>
                <td>Atender obligaciones legales, requerimientos judiciales o de autoridades competentes.</td>
                <td>Cumplimiento de obligaciones legales.</td>
              </tr>
            </tbody>
          </table>
          <p>
            La informacion sobre privacidad no sustituye al consentimiento cuando este sea necesario. Si en el futuro se añaden
            finalidades opcionales, como analitica no esencial o marketing, se recabara un consentimiento separado, libre e informado.
          </p>
        </>
      ),
    },
    {
      id: 'proveedores',
      title: 'Encargados, terceros y transferencias',
      content: (
        <>
          <p>
            La plataforma utiliza actualmente infraestructura y servicios de terceros para poder funcionar. Entre ellos se encuentran:
          </p>
          <ul>
            <li>
              <strong>Firebase / Google</strong> para autenticacion, base de datos, almacenamiento asociado y operativa tecnica de la plataforma.
            </li>
            <li>
              <strong>Google Sign-In</strong> cuando el usuario decide autenticarse con su cuenta de Google.
            </li>
            <li>
              <strong>OpenStreetMap</strong> y la capa tecnica de mapa usada en el panel para seleccionar la ubicacion exacta de la barberia.
            </li>
            <li>
              <strong>Google Maps</strong> cuando el usuario abre enlaces de ruta o navegacion fuera de la plataforma.
            </li>
          </ul>
          <p>
            Estos proveedores pueden tratar datos como direccion IP, identificadores de cuenta, metadatos tecnicos y datos necesarios
            para la prestacion del servicio. Cuando exista transferencia internacional de datos, esta debera apoyarse en un mecanismo
            valido conforme al RGPD, como clausulas contractuales tipo, decisiones de adecuacion o marcos reconocidos aplicables.
          </p>
          <p>
            Si en el futuro se habilitan pagos con Stripe u otros servicios equivalentes, esta politica debera actualizarse para incluir
            el proveedor de pagos, su DPA y las bases juridicas especificas de ese tratamiento.
          </p>
        </>
      ),
    },
    {
      id: 'conservacion',
      title: 'Plazos de conservacion',
      content: (
        <>
          <ul>
            <li>Los datos de cuenta se conservan mientras la cuenta permanezca activa o mientras sean necesarios para la gestion del servicio.</li>
            <li>Los datos de barberia y configuracion se conservan mientras exista relacion operativa con la barberia en la plataforma.</li>
            <li>Las reservas, reseñas y registros vinculados a obligaciones legales o a defensa de reclamaciones se conservaran durante el tiempo exigido por la normativa aplicable o hasta la prescripcion de responsabilidades.</li>
            <li>Los datos tecnicos y de seguridad se conservaran por el tiempo razonablemente necesario para auditoria, prevencion de fraude y proteccion del sistema.</li>
          </ul>
          <p>
            Cuando los datos dejen de ser necesarios, deberan eliminarse o anonimizarse de manera segura, sin perjuicio de los bloqueos
            que exija la normativa aplicable.
          </p>
        </>
      ),
    },
    {
      id: 'derechos',
      title: 'Derechos de las personas usuarias',
      content: (
        <>
          <p>Las personas interesadas pueden ejercer, cuando proceda, los derechos de acceso, rectificacion, supresion, oposicion, limitacion y portabilidad.</p>
          <p>
            Asimismo, pueden retirar en cualquier momento el consentimiento que hayan prestado para tratamientos basados en dicho consentimiento,
            sin que ello afecte a la licitud del tratamiento anterior a la retirada.
          </p>
          <p>
            Si considera que el tratamiento no se ajusta a la normativa, puede presentar reclamacion ante la Agencia Espanola de Proteccion
            de Datos (AEPD).
          </p>
        </>
      ),
    },
    {
      id: 'seguridad',
      title: 'Seguridad, aislamiento y cumplimiento',
      content: (
        <>
          <p>La plataforma aplica y debe seguir reforzando medidas tecnicas y organizativas adecuadas para proteger los datos personales.</p>
          <ul>
            <li>Autenticacion de usuarios mediante Firebase Authentication.</li>
            <li>Aislamiento logico entre barberias a traves de Firestore Security Rules y control por roles.</li>
            <li>Acceso restringido a documentos y subcolecciones segun el usuario autenticado y su relacion con la barberia.</li>
            <li>Proteccion operativa frente a errores y trazabilidad tecnica basica para diagnostico y seguridad.</li>
          </ul>
          <p>
            Antes de un despliegue productivo general, el titular del servicio debera activar y documentar al menos las siguientes medidas
            adicionales: exportaciones automaticas de Firestore a Cloud Storage, plan de gestion de brechas de seguridad, pruebas automatizadas
            de reglas de acceso, y limitacion de peticiones en cualquier API o Cloud Function expuesta al publico.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalPageShell
      badge="Privacidad"
      title="Politica de privacidad"
      description="Resumen transparente sobre como se tratan los datos personales dentro de la plataforma y en la relacion entre barberias y clientes."
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
