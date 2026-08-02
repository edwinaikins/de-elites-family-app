import PDFDocument from "pdfkit";

// A snapshot of one member application, formatted as a standalone PDF —
// generated on submission so it can be emailed / posted to WhatsApp as an
// attachment, independent of the CMS (which the recipient may not have
// access to). Keep this in sync with MemberApplication in src/types.ts.
export interface ApplicationPdfData {
  id: string;
  fullName: string;
  nickname?: string;
  dob: string;
  gender: string;
  occupation: string;
  residence: string;
  phone: string;
  email: string;
  socialHandles?: string;
  referrer?: string;
  priorGroupMember: boolean;
  priorGroupDetail?: string;
  reasonForJoining: string;
  contributionAreas: string[];
  activityLevel: string;
  willingToSupportFinancially: boolean;
  agreesToRulesAndDiscipline: boolean;
  submittedAt: string;
}

// pdfkit streams output as chunks rather than returning a value directly —
// this wraps that in a Promise<Buffer> so callers can just `await` it like
// any other async data-producing function.
export function generateApplicationPdf(app: ApplicationPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc.fillColor("#b8860b").fontSize(20).font("Helvetica-Bold").text("DE ELITES FAMILY", { align: "center" });
      doc.fillColor("#555555").fontSize(11).font("Helvetica").text("Membership Application", { align: "center" });
      doc.moveDown(1.5);
      doc.strokeColor("#b8860b").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      const row = (label: string, value: string) => {
        doc.fillColor("#888888").fontSize(9).font("Helvetica-Bold").text(label.toUpperCase());
        doc.fillColor("#111111").fontSize(11).font("Helvetica").text(value && value.trim() ? value : "—");
        doc.moveDown(0.6);
      };

      row("Full Name", app.fullName);
      if (app.nickname) row("Nickname", app.nickname);
      row("Date of Birth", app.dob);
      row("Gender", app.gender);
      row("Occupation", app.occupation);
      row("Residence", app.residence);
      row("Phone", app.phone);
      row("Email", app.email);
      if (app.socialHandles) row("Social Handles", app.socialHandles);
      if (app.referrer) row("Referred By", app.referrer);
      row("Prior Group Member", app.priorGroupMember ? "Yes" : "No");
      if (app.priorGroupMember && app.priorGroupDetail) row("Prior Group Detail", app.priorGroupDetail);
      row("Reason For Joining", app.reasonForJoining);
      row("Contribution Areas", app.contributionAreas.length ? app.contributionAreas.join(", ") : "—");
      row("Activity Level", app.activityLevel);
      row("Willing To Support Financially", app.willingToSupportFinancially ? "Yes" : "No");
      row("Agrees To Rules & Discipline", app.agreesToRulesAndDiscipline ? "Yes" : "No");

      doc.moveDown(0.5);
      doc.fillColor("#aaaaaa").fontSize(8).font("Helvetica")
        .text(`Application ID: ${app.id}`, { align: "right" })
        .text(`Submitted: ${new Date(app.submittedAt).toLocaleString()}`, { align: "right" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
