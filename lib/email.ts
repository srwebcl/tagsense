import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.RESEND_FROM || "TAGSENSE <onboarding@resend.dev>";

export interface NotificacionInformeParams {
  folio: string | null;
  pdfBytes: Uint8Array;
  technician: {
    email: string;
    fullName?: string | null;
  };
  asset: {
    name: string;
    tagCode: string;
    model?: string | null;
  };
  intervention: {
    diagnosis?: string | null;
    workPerformed?: string | null;
    operationalAfter?: string | null;
    startedAt?: string | Date | null;
    finishedAt?: string | Date | null;
  };
  adminEmails: string[];
  downloadUrl?: string | null;
}

export async function enviarNotificacionInforme(params: NotificacionInformeParams): Promise<{ success: boolean; error?: string; recipients?: string[] }> {
  if (!resend) {
    console.warn("[lib/email] RESEND_API_KEY no configurada. Omitiendo envío de correo.");
    return { success: false, error: "RESEND_API_KEY no configurada" };
  }

  const { folio, pdfBytes, technician, asset, intervention, adminEmails, downloadUrl } = params;

  // Consolidar y deduplicar correos de destino (técnico + admins)
  const destinatariosSet = new Set<string>();
  if (technician.email && technician.email.includes("@")) {
    destinatariosSet.add(technician.email.trim().toLowerCase());
  }
  for (const adminEmail of adminEmails) {
    if (adminEmail && adminEmail.includes("@")) {
      destinatariosSet.add(adminEmail.trim().toLowerCase());
    }
  }

  const destinatarios = Array.from(destinatariosSet);
  if (destinatarios.length === 0) {
    console.warn("[lib/email] No hay destinatarios válidos para la notificación.");
    return { success: false, error: "Sin destinatarios válidos" };
  }

  const folioStr = folio || `INF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const fechaStr = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });

  const estadoBadgeColor = intervention.operationalAfter === "operativo" ? "#34C759" : "#F59E0B";
  const estadoTexto = (intervention.operationalAfter || "Operativo").toUpperCase();

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo Informe Técnico TAGSENSE - ${folioStr}</title>
</head>
<body style="margin:0; padding:0; background-color:#111213; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#E8E8D8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#111213; width:100%; padding:24px 12px;">
    <tr>
      <td align="center">
        <!-- Contenedor Principal -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px; background-color:#17191A; border:1px solid #2B2E30; border-radius:14px; overflow:hidden; box-shadow:0 12px 32px rgba(0,0,0,0.45);">
          
          <!-- Encabezado con Identidad TAGSENSE -->
          <tr>
            <td style="padding:28px 24px 22px; background:linear-gradient(135deg, #1C1E20 0%, #17191A 100%); border-bottom:1px solid #2B2E30;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="font-size:20px; font-weight:900; letter-spacing:1.5px; color:#E8E8D8;">TAG<span style="color:#D07838;">SENSE</span></span>
                    <div style="font-size:11px; color:#A0A5A8; font-weight:600; letter-spacing:0.5px; margin-top:3px; text-transform:uppercase;">Plataforma de Mantenimiento & Control de Activos</div>
                  </td>
                  <td align="right">
                    <span style="display:inline-block; padding:5px 10px; background-color:rgba(208,120,56,0.12); border:1px solid rgba(208,120,56,0.3); border-radius:20px; font-size:11px; font-weight:800; color:#D07838; letter-spacing:0.3px;">
                      ${folioStr}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cuerpo del Correo -->
          <tr>
            <td style="padding:28px 24px;">
              <h1 style="margin:0 0 10px; font-size:20px; font-weight:800; color:#FFFFFF; line-height:1.3;">
                Nuevo Informe Técnico de Mantenimiento
              </h1>
              <p style="margin:0 0 20px; font-size:13.5px; line-height:1.6; color:#A0A5A8;">
                Se ha completado y emitido con éxito una nueva intervención técnica en terreno. A continuación se detallan los antecedentes del activo y el diagnóstico registrado:
              </p>

              <!-- Tarjeta de Datos del Activo -->
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#202224; border:1px solid #2D3133; border-radius:10px; margin-bottom:20px; overflow:hidden;">
                <tr>
                  <td style="padding:16px 18px; border-bottom:1px solid #2D3133;">
                    <div style="font-size:11px; font-weight:800; color:#D07838; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px;">Equipo Intervenido</div>
                    <div style="font-size:17px; font-weight:800; color:#FFFFFF;">${asset.name}</div>
                    <div style="font-size:12.5px; color:#A0A5A8; margin-top:2px;">ID Tag: <strong style="color:#E8E8D8;">${asset.tagCode}</strong> ${asset.model ? `· Modelo: <strong style="color:#E8E8D8;">${asset.model}</strong>` : ""}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="50%" style="font-size:12px; color:#A0A5A8; padding:4px 0;">
                          Estado Operacional:
                        </td>
                        <td width="50%" align="right" style="padding:4px 0;">
                          <span style="display:inline-block; font-size:11px; font-weight:800; color:${estadoBadgeColor}; background:rgba(52,199,89,0.12); padding:3px 8px; border-radius:6px; border:1px solid ${estadoBadgeColor}33;">
                            ${estadoTexto}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:12px; color:#A0A5A8; padding:4px 0;">
                          Técnico Responsable:
                        </td>
                        <td align="right" style="font-size:12px; font-weight:700; color:#E8E8D8; padding:4px 0;">
                          ${technician.fullName || technician.email}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:12px; color:#A0A5A8; padding:4px 0;">
                          Fecha y Hora:
                        </td>
                        <td align="right" style="font-size:12px; color:#E8E8D8; padding:4px 0;">
                          ${fechaStr}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Detalle de la Intervención -->
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
                ${intervention.diagnosis ? `
                <tr>
                  <td style="padding-bottom:12px;">
                    <div style="font-size:11.5px; font-weight:800; color:#D07838; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Diagnóstico Técnico</div>
                    <div style="font-size:13px; line-height:1.55; color:#E8E8D8; background-color:#1C1E20; border-left:3px solid #D07838; padding:10px 14px; border-radius:0 8px 8px 0;">
                      ${intervention.diagnosis}
                    </div>
                  </td>
                </tr>` : ""}
                ${intervention.workPerformed ? `
                <tr>
                  <td style="padding-bottom:12px;">
                    <div style="font-size:11.5px; font-weight:800; color:#D07838; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Trabajo Realizado</div>
                    <div style="font-size:13px; line-height:1.55; color:#E8E8D8; background-color:#1C1E20; border-left:3px solid #F08840; padding:10px 14px; border-radius:0 8px 8px 0;">
                      ${intervention.workPerformed}
                    </div>
                  </td>
                </tr>` : ""}
              </table>

              <!-- Botón de Acción Principal -->
              ${downloadUrl ? `
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
                <tr>
                  <td align="center">
                    <a href="${downloadUrl}" target="_blank" style="display:inline-block; background:linear-gradient(135deg, #D07838 0%, #B86228 100%); color:#111213; font-size:13px; font-weight:800; text-decoration:none; padding:13px 28px; border-radius:24px; letter-spacing:0.3px; box-shadow:0 6px 16px rgba(208,120,56,0.35);">
                      Ver / Descargar Informe en PDF
                    </a>
                  </td>
                </tr>
              </table>` : ""}

              <p style="margin:16px 0 0; font-size:11.5px; color:#787E82; text-align:center;">
                📎 El documento oficial en PDF se encuentra adjunto a este correo electrónico.
              </p>
            </td>
          </tr>

          <!-- Pie de Página -->
          <tr>
            <td style="padding:18px 24px; background-color:#141516; border-top:1px solid #242728; text-align:center;">
              <p style="margin:0; font-size:11px; color:#5D6367; line-height:1.5;">
                Notificación automática generada por <strong>TAGSENSE</strong>.<br>
                Este correo fue enviado al técnico responsable y al equipo de administración técnica.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const attachmentBuffer = Buffer.from(pdfBytes);
    const result = await resend.emails.send({
      from: fromEmail,
      to: destinatarios,
      subject: `[TAGSENSE] Nuevo Informe de Mantención ${folioStr} — ${asset.name}`,
      html: htmlContent,
      attachments: [
        {
          filename: `Informe-${folioStr}.pdf`,
          content: attachmentBuffer,
        },
      ],
    });

    if (result.error) {
      console.error("[lib/email] Error devuelto por Resend:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[lib/email] Notificación enviada con éxito para ${folioStr} a: ${destinatarios.join(", ")}`);
    return { success: true, recipients: destinatarios };
  } catch (err: any) {
    console.error("[lib/email] Excepción al enviar correo con Resend:", err);
    return { success: false, error: err?.message || "Error inesperado al enviar correo" };
  }
}
