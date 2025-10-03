import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  workerName: string;
  documentTitle: string;
  documentUrl: string;
  fileName: string;
  companyName?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, workerName, documentTitle, documentUrl, fileName, companyName } = await req.json() as EmailRequest;

    if (!to || !workerName || !documentTitle || !documentUrl) {
      return new Response(
        JSON.stringify({ error: "Faltan parámetros requeridos" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const company = companyName || "Sistema Documental";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${company}</h1>
            </div>
            <div class="content">
              <h2>Hola ${workerName},</h2>
              <p>Tiene un nuevo documento disponible en el sistema:</p>
              <p><strong>Documento:</strong> ${documentTitle}</p>
              <p><strong>Archivo:</strong> ${fileName}</p>
              <p>Puede descargar el documento haciendo clic en el botón de abajo:</p>
              <div style="text-align: center;">
                <a href="${documentUrl}" class="button">Descargar Documento</a>
              </div>
              <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                También puede acceder a todos sus documentos iniciando sesión en el portal del trabajador.
              </p>
            </div>
            <div class="footer">
              <p>Este es un correo automático, por favor no responda.</p>
              <p>${company} - Sistema de Gestión Documental</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY no está configurada");
      return new Response(
        JSON.stringify({ 
          error: "Servicio de email no configurado",
          success: false 
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Sistema Documental <onboarding@resend.dev>",
        to: [to],
        subject: `Nuevo documento: ${documentTitle}`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error("Error de Resend:", error);
      return new Response(
        JSON.stringify({ 
          error: "Error al enviar email",
          details: error,
          success: false 
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const result = await resendResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email enviado exitosamente",
        id: result.id 
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error en send-document-email:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Error desconocido",
        success: false 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});