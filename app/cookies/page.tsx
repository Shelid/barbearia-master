import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/legal/LegalPageShell';
import { LEGAL_LAST_UPDATED, LEGAL_PRODUCTION_NOTICE, LEGAL_SERVICE_NAME } from '@/lib/legal';

export const metadata: Metadata = {
  title: `Cookies | ${LEGAL_SERVICE_NAME}`,
  description: 'Informacion sobre cookies, almacenamiento tecnico y consentimiento en BarberFlow Spain.',
};

export default function CookiesPage() {
  const sections = [
    {
      id: 'que-son',
      title: 'Que son las cookies y tecnologias similares',
      content: (
        <>
          <p>
            Las cookies son pequenos archivos que se almacenan en el navegador o en el dispositivo del usuario para permitir o mejorar determinadas funciones del sitio web.
          </p>
          <p>
            Ademas de cookies, algunos servicios pueden utilizar almacenamiento local del navegador, IndexedDB o mecanismos equivalentes para mantener la sesion, recordar estados tecnicos o reforzar la seguridad.
          </p>
        </>
      ),
    },
    {
      id: 'uso-actual',
      title: 'Uso actual en la plataforma',
      content: (
        <>
          <p>
            En el estado actual del proyecto, {LEGAL_SERVICE_NAME} esta diseñado para operar principalmente con cookies y almacenamientos tecnicos o estrictamente necesarios para:
          </p>
          <ul>
            <li>Permitir el acceso y la persistencia de sesion de usuarios autenticados.</li>
            <li>Proteger el servicio frente a usos indebidos, errores de seguridad y control basico de sesion.</li>
            <li>Mantener el funcionamiento tecnico de la interfaz y de servicios necesarios para la plataforma.</li>
          </ul>
          <p>
            No se ha identificado en el codigo actual una implantacion activa de cookies publicitarias ni de analitica propia. Si en el futuro se incorporan, la plataforma debera mostrar un sistema de consentimiento previo antes de activarlas.
          </p>
        </>
      ),
    },
    {
      id: 'categorias',
      title: 'Categorias informativas',
      content: (
        <>
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Estado actual</th>
                <th>Consentimiento</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Cookies tecnicas o estrictamente necesarias</td>
                <td>Previstas para autenticacion, seguridad y operativa basica del servicio.</td>
                <td>No requieren consentimiento previo cuando son imprescindibles para prestar el servicio solicitado.</td>
              </tr>
              <tr>
                <td>Preferencias</td>
                <td>No se ha detectado una capa especifica de cookies de preferencias no esenciales en el codigo actual.</td>
                <td>Si se implantan y no son estrictamente necesarias, debera recabarse consentimiento cuando corresponda.</td>
              </tr>
              <tr>
                <td>Analitica o medicion</td>
                <td>No se ha identificado uso activo en la implementacion actual publicada.</td>
                <td>Requiere informacion clara y consentimiento valido antes de activarse, salvo base exenta legalmente aplicable.</td>
              </tr>
              <tr>
                <td>Publicidad o perfilado</td>
                <td>No implementado en el estado actual del proyecto.</td>
                <td>Requiere consentimiento previo, libre, especifico e informado.</td>
              </tr>
            </tbody>
          </table>
        </>
      ),
    },
    {
      id: 'terceros',
      title: 'Servicios de terceros y enlaces externos',
      content: (
        <>
          <p>El servicio puede interactuar con terceros aunque no siempre mediante cookies propias de la plataforma:</p>
          <ul>
            <li>Firebase y Google pueden utilizar mecanismos tecnicos necesarios para autenticacion y seguridad.</li>
            <li>El acceso con Google se realiza en dominios gestionados por Google y queda sujeto a sus propias politicas.</li>
            <li>El selector de mapa puede implicar solicitudes a OpenStreetMap para cargar teselas del mapa.</li>
            <li>Los enlaces de navegacion externa hacia Google Maps se abren fuera de la plataforma y quedan sujetos a la politica del tercero.</li>
          </ul>
          <p>
            El hecho de acceder a servicios externos puede implicar el tratamiento de direccion IP y otros metadatos tecnicos por parte del tercero correspondiente.
          </p>
        </>
      ),
    },
    {
      id: 'consentimiento',
      title: 'Consentimiento y gestion',
      content: (
        <>
          <p>
            Las cookies estrictamente tecnicas o necesarias pueden utilizarse sin consentimiento previo cuando sean indispensables para prestar el servicio expresamente solicitado por el usuario.
          </p>
          <p>
            Si la plataforma incorpora en el futuro cookies no necesarias, debera ofrecer al mismo tiempo y con la misma visibilidad una opcion clara para aceptar o rechazar dichas cookies, asi como una capa de informacion comprensible y accesible.
          </p>
          <p>
            El usuario puede gestionar o eliminar cookies desde la configuracion de su navegador. Debe tenerse en cuenta que el bloqueo de cookies tecnicas o del almacenamiento necesario puede afectar al acceso y funcionamiento de la plataforma.
          </p>
        </>
      ),
    },
    {
      id: 'actualizaciones',
      title: 'Actualizaciones de esta politica',
      content: (
        <>
          <p>
            Esta politica se revisara cuando se activen nuevas herramientas de analitica, publicidad, pagos, personalizacion o cualquier otra tecnologia de almacenamiento o seguimiento que altere el estado actual del servicio.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalPageShell
      badge="Cookies"
      title="Politica de cookies"
      description="Informacion clara sobre cookies, almacenamiento tecnico y reglas de consentimiento aplicables a la plataforma."
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
