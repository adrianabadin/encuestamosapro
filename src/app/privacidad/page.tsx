import type { Metadata } from "next";
import Link from "next/link";
import { MosaproHeader } from "@/components/MosaproHeader";

export const metadata: Metadata = {
  title: "Política de privacidad | MOSAPRO Relevamiento",
  description:
    "Qué datos recopila el relevamiento sanitario del MOSAPRO (web y app Android), para qué se usan y cómo pedir su eliminación.",
};

const CONTACT_EMAIL = "aabadin@gmail.com";
const LAST_UPDATED = "22 de octubre de 2026";

export default function PrivacidadPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <MosaproHeader showAdminLink={false} />
      <main className="flex-1">
        <article className="max-w-3xl mx-auto my-8 px-4 pb-16">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6 text-[15px] leading-relaxed text-slate-800">
            <header className="space-y-1">
              <h1 className="text-2xl font-extrabold text-[#567c7f]">
                Política de privacidad
              </h1>
              <p className="text-xs text-slate-500">
                MOSAPRO Relevamiento (sitio web y aplicación Android
                «ar.com.mosapro.relevamiento») · Última actualización:{" "}
                {LAST_UPDATED}
              </p>
            </header>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-[#3f5f61]">
                1. Quién es responsable
              </h2>
              <p>
                El relevamiento es realizado por el Movimiento Sanitario
                Provincial (MOSAPRO). Para cualquier consulta sobre tus datos
                podés escribir a{" "}
                <a
                  className="text-[#567c7f] font-semibold underline"
                  href={`mailto:${CONTACT_EMAIL}`}
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-[#3f5f61]">
                2. Encuesta anónima
              </h2>
              <p>
                La encuesta no pide nombre, DNI, teléfono ni email. Solo se
                completa si aceptás participar en la pantalla de
                consentimiento. Se registran tus respuestas: espacio donde
                trabajás, rol o tarea, región sanitaria y municipio elegidos
                por vos, antigüedad, temáticas prioritarias, problemas y
                propuestas escritas, y tu interés en participar de mesas de
                trabajo.
              </p>
              <p>
                Las respuestas se analizan de forma agregada y solo las ve el
                equipo de sistematización del MOSAPRO. No las vendemos ni las
                compartimos con terceros. Te pedimos que no escribas datos que
                identifiquen a personas en las respuestas abiertas.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-[#3f5f61]">
                3. Formulario de contacto (opcional y separado)
              </h2>
              <p>
                Si querés que te convoquemos a una mesa de trabajo, podés
                completar un formulario aparte con tu nombre, teléfono o
                WhatsApp, email (opcional), región, municipio, organización,
                temáticas de interés y comentarios. Esos datos se guardan en
                una base distinta y{" "}
                <strong>no se vinculan con tus respuestas a la encuesta</strong>
                . Solo se usan para contactarte por las mesas de trabajo.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-[#3f5f61]">
                4. Funcionamiento sin conexión
              </h2>
              <p>
                Para poder usarse sin internet, la aplicación y el sitio
                guardan temporalmente en tu dispositivo las respuestas y los
                contactos pendientes de envío. En la app Android, los datos de
                contacto pendientes se guardan cifrados. Una vez enviados al
                servidor, se eliminan de la cola del dispositivo.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-[#3f5f61]">
                5. Lo que no hacemos
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>No usamos la ubicación GPS del dispositivo.</li>
                <li>No mostramos publicidad ni usamos rastreadores publicitarios.</li>
                <li>No vendemos ni cedemos datos a terceros.</li>
                <li>
                  No pedimos permisos sensibles: la app solo usa conexión a
                  internet y el estado de la red para sincronizar.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-[#3f5f61]">
                6. Seguridad
              </h2>
              <p>
                Los datos viajan cifrados (HTTPS) hasta el servidor del
                relevamiento. El acceso al panel de administración está
                restringido a usuarios validados.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-[#3f5f61]">
                7. Tus derechos y cómo pedir la eliminación
              </h2>
              <p>
                Podés pedir acceso, rectificación o eliminación de tus datos de
                contacto escribiendo a{" "}
                <a
                  className="text-[#567c7f] font-semibold underline"
                  href={`mailto:${CONTACT_EMAIL}?subject=Baja%20de%20datos%20MOSAPRO`}
                >
                  {CONTACT_EMAIL}
                </a>{" "}
                con el asunto «Baja de datos MOSAPRO» e indicando el nombre y
                teléfono o email con los que te registraste. Como la encuesta es
                anónima, no podemos identificar ni borrar una respuesta
                individual.
              </p>
              <p>
                Estos derechos están reconocidos por la Ley 25.326 de
                Protección de los Datos Personales de la República Argentina.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-[#3f5f61]">
                8. Cambios en esta política
              </h2>
              <p>
                Si cambiamos esta política, vamos a actualizar la fecha de
                arriba en esta misma página.
              </p>
            </section>

            <div className="pt-2 border-t border-slate-100">
              <Link
                href="/"
                className="text-sm font-semibold text-[#567c7f] hover:underline"
              >
                ← Volver al relevamiento
              </Link>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
