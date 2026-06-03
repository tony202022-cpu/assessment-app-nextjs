import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email, reportUrl } = await req.json();

    if (!email || !reportUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing data",
        },
        {
          status: 400,
        }
      );
    }

    const isArabic = reportUrl.includes("lang=ar");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,

      subject: isArabic
        ? "تقرير التقييم الخاص بك"
        : "Your Career Labs AI Assessment Report",

      html: isArabic
        ? `
          <div dir="rtl" style="font-family: Arial, sans-serif; line-height:1.8;">
            <p>مرحباً،</p>

            <p>شكراً لإكمال التقييم.</p>

            <p>
              يمكنك الوصول إلى تقريرك في أي وقت من خلال الرابط التالي:
            </p>

            <p>
              <a href="${reportUrl}">
                فتح التقرير
              </a>
            </p>

           <p style="margin-top:20px;color:#666;">
  يمكنك مشاركة هذا التقرير بشكل آمن مع مدير أو زميل أو مستشار أو مدرب أو شريك عمل مباشرة من داخل التقرير.
</p>

<p>
  مع التحية،
  <br />
  Career Labs AI
</p>
          </div>
        `
        : `
          <div style="font-family: Arial, sans-serif; line-height:1.8;">
            <p>Hello,</p>

            <p>Thank you for completing your assessment.</p>

            <p>
              You can access your report anytime using the link below:
            </p>

            <p>
              <a href="${reportUrl}">
                Open My Report
              </a>
            </p>

            <p style="margin-top:20px;color:#666;">
  You may securely share this report with a manager, colleague, consultant, coach, or business partner directly from within the report.
</p>

<p>
  Regards,
  <br />
  Career Labs AI
</p>
          </div>
        `,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}