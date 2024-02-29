const nodemailer = require("nodemailer");

const startEmailWrapper = `<!doctype html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Simple Transactional Email</title>
    <style media="all" type="text/css">
    /* -------------------------------------
    GLOBAL RESETS
------------------------------------- */
    
    body {
      font-family: Helvetica, sans-serif;
      -webkit-font-smoothing: antialiased;
      font-size: 16px;
      line-height: 1.3;
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
    }
    
    table {
      border-collapse: separate;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
      width: 100%;
    }
    
    table td {
      font-family: Helvetica, sans-serif;
      font-size: 16px;
      vertical-align: top;
    }
    /* -------------------------------------
    BODY & CONTAINER
------------------------------------- */
    
    body {
      background-color: #f4f5f6;
      margin: 0;
      padding: 0;
    }
    
    .body {
      background-color: #f4f5f6;
      width: 100%;
    }
    
    .container {
      margin: 0 auto !important;
      max-width: 600px;
      padding: 0;
      padding-top: 24px;
      width: 600px;
    }
    
    .content {
      box-sizing: border-box;
      display: block;
      margin: 0 auto;
      max-width: 600px;
      padding: 0;
    }
    /* -------------------------------------
    HEADER, FOOTER, MAIN
------------------------------------- */
    
    .main {
      background: #ffffff;
      border: 1px solid #eaebed;
      border-radius: 16px;
      width: 100%;
    }
    
    .wrapper {
      box-sizing: border-box;
      padding: 24px;
    }
    
    .footer {
      clear: both;
      padding-top: 24px;
      text-align: center;
      width: 100%;
    }
    
    .footer td,
    .footer p,
    .footer span,
    .footer a {
      color: #9a9ea6;
      font-size: 16px;
      text-align: center;
    }
    /* -------------------------------------
    TYPOGRAPHY
------------------------------------- */
    
    p {
      font-family: Helvetica, sans-serif;
      font-size: 16px;
      font-weight: normal;
      margin: 0;
      margin-bottom: 16px;
    }
    
    a {
      color: #0867ec;
      text-decoration: underline;
    }
    /* -------------------------------------
    BUTTONS
------------------------------------- */
    
    .btn {
      box-sizing: border-box;
      min-width: 100% !important;
      width: 100%;
    }
    
    .btn > tbody > tr > td {
      padding-bottom: 16px;
    }
    
    .btn table {
      width: auto;
    }
    
    .btn table td {
      background-color: #ffffff;
      border-radius: 4px;
      text-align: center;
    }
    
    .btn a {
      background-color: #ffffff;
      border: solid 2px #0867ec;
      border-radius: 4px;
      box-sizing: border-box;
      color: #0867ec;
      cursor: pointer;
      display: inline-block;
      font-size: 16px;
      font-weight: bold;
      margin: 0;
      padding: 12px 24px;
      text-decoration: none;
      text-transform: capitalize;
    }
    
    .btn-primary table td {
      background-color: #0867ec;
    }
    
    .btn-primary a {
      background-color: #0867ec;
      border-color: #0867ec;
      color: #ffffff;
    }
    
    @media all {
      .btn-primary table td:hover {
        background-color: #ec0867 !important;
      }
      .btn-primary a:hover {
        background-color: #ec0867 !important;
        border-color: #ec0867 !important;
      }
    }
    
    /* -------------------------------------
    OTHER STYLES THAT MIGHT BE USEFUL
------------------------------------- */
    
    .last {
      margin-bottom: 0;
    }
    
    .first {
      margin-top: 0;
    }
    
    .align-center {
      text-align: center;
    }
    
    .align-right {
      text-align: right;
    }
    
    .align-left {
      text-align: left;
    }
    
    .text-link {
      color: #0867ec !important;
      text-decoration: underline !important;
    }
    
    .clear {
      clear: both;
    }
    
    .mt0 {
      margin-top: 0;
    }
    
    .mb0 {
      margin-bottom: 0;
    }
    
    .preheader {
      color: transparent;
      display: none;
      height: 0;
      max-height: 0;
      max-width: 0;
      opacity: 0;
      overflow: hidden;
      mso-hide: all;
      visibility: hidden;
      width: 0;
    }
    
    .powered-by a {
      text-decoration: none;
    }
    
    /* -------------------------------------
    RESPONSIVE AND MOBILE FRIENDLY STYLES
------------------------------------- */
    
    @media only screen and (max-width: 640px) {
      .main p,
      .main td,
      .main span {
        font-size: 16px !important;
      }
      .wrapper {
        padding: 8px !important;
      }
      .content {
        padding: 0 !important;
      }
      .container {
        padding: 0 !important;
        padding-top: 8px !important;
        width: 100% !important;
      }
      .main {
        border-left-width: 0 !important;
        border-radius: 0 !important;
        border-right-width: 0 !important;
      }
      .btn table {
        max-width: 100% !important;
        width: 100% !important;
      }
      .btn a {
        font-size: 16px !important;
        max-width: 100% !important;
        width: 100% !important;
      }
    }
    /* -------------------------------------
    PRESERVE THESE STYLES IN THE HEAD
------------------------------------- */
    
    @media all {
      .ExternalClass {
        width: 100%;
      }
      .ExternalClass,
      .ExternalClass p,
      .ExternalClass span,
      .ExternalClass font,
      .ExternalClass td,
      .ExternalClass div {
        line-height: 100%;
      }
      .apple-link a {
        color: inherit !important;
        font-family: inherit !important;
        font-size: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
        text-decoration: none !important;
      }
      #MessageViewBody a {
        color: inherit;
        text-decoration: none;
        font-size: inherit;
        font-family: inherit;
        font-weight: inherit;
        line-height: inherit;
      }
    }
    </style>
  </head>
  <body>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body">
      <tr>
        <td>&nbsp;</td>
        <td class="container">
          <div class="content">

            <!-- START CENTERED WHITE CONTAINER -->
            <span class="preheader">This is preheader text. Some clients will show this text as a preview.</span>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="main">`;
const endEmailWrapper = ` <!-- END MAIN CONTENT AREA -->
</table>

<!-- END FOOTER -->

<!-- END CENTERED WHITE CONTAINER --></div>
</td>
<td>&nbsp;</td>
</tr>
</table>
</body>
</html>`;
const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: process.env.SMTP_PORT,
	secure: true,
	auth: {
		type: "OAuth2",
		user: process.env.EMAIL,
		clientId: process.env.EMAIL_CLIENT_ID,
		clientSecret: process.env.EMAIL_CLIENT_SECRET,
		refreshToken: process.env.EMAIL_REFRESH_TOKEN,
	},
});

const bcc = "dygnify@gmail.com";

const userRegistration = async (email, password, role, link, cc) => {
	const mainBody = `<!-- START MAIN CONTENT AREA -->
    <tr>
      <td class="wrapper">
      <p>Dear ${email},</p>
      <p>You have been successfully registered as a ${role} for Project iGreen.
      Please login to the platform using the <a href="${link}">link</a> and the email ${email} and password ${password}.</p>
      <p>Thanks,<br/>Team Project iGreen</p>  
      </td>
    </tr>`;

	const info = await transporter.sendMail({
		from: "Dygnify Ventures <hello@dygnify.com>",
		to: email,
		subject: "Project iGreen - New user registered",
		html: startEmailWrapper + mainBody + endEmailWrapper,
		cc: cc,
		bcc: bcc,
	});

	console.log("Message sent: " + info.messageId);
};
const createProfile = async (email, role, cc) => {
	const mainBody = `<!-- START MAIN CONTENT AREA -->
    <tr>
      <td class="wrapper">
      <p>Dear ${email},</p>
      <p>You have successfully created your profile for your role as ${role} for Project iGreen.</p>
      <p>Thanks,<br/>Team Project iGreen</p>  
      </td>
    </tr>`;

	const info = await transporter.sendMail({
		from: "Dygnify Ventures <hello@dygnify.com>",
		to: email,
		subject: "Project iGreen - User profile created",
		html: startEmailWrapper + mainBody + endEmailWrapper,
		cc: cc,
		bcc: bcc,
	});

	console.log("Message sent: " + info.messageId);
};
const completeKyc = async (name, email, role, cc) => {
	const mainBody = `<!-- START MAIN CONTENT AREA -->
    <tr>
      <td class="wrapper">
      <p>Dear ${name},</p>
      <p>Your KYC has been successfully completed. You may now use the platform as per your role as  ${role} for Project iGreen.</p>
      <p>Thanks,<br/>Team Project iGreen</p>  
      </td>
    </tr>`;

	const info = await transporter.sendMail({
		from: "Dygnify Ventures <hello@dygnify.com>",
		to: email,
		subject: "Project iGreen - KYC completed",
		html: startEmailWrapper + mainBody + endEmailWrapper,
		cc: cc,
		bcc: bcc,
	});

	console.log("Message sent: " + info.messageId);
};
const borrowRequestCreation = async (name, email, cc) => {
	const mainBody = `<!-- START MAIN CONTENT AREA -->
    <tr>
      <td class="wrapper">
      <p>Dear ${name},</p>
      <p>You have successfully created a Green Bond request. You will be notified when the request gets approved.</p>
      <p>Thanks,<br/>Team Project iGreen</p>  
      </td>
    </tr>`;

	const info = await transporter.sendMail({
		from: "Dygnify Ventures <hello@dygnify.com>",
		to: email,
		subject: "Project iGreen - Bond proposal creation",
		html: startEmailWrapper + mainBody + endEmailWrapper,
		cc: cc,
		bcc: bcc,
	});

	console.log("Message sent: " + info.messageId);
};

const adminApproval = async (name, email, approved, cc) => {
	const mainBody = `<!-- START MAIN CONTENT AREA -->
    <tr>
      <td class="wrapper">
      <p>Dear ${name},</p>
      <p>Your Green Bond request has been ${
			approved ? "successfully approved" : "rejected"
		} by Admin.</p>
      <p>Thanks,<br/>Team Project iGreen</p>  
      </td>
    </tr>`;

	const info = await transporter.sendMail({
		from: "Dygnify Ventures <hello@dygnify.com>",
		to: email,
		subject: "Project iGreen - Bond proposal Admin approval",
		html: startEmailWrapper + mainBody + endEmailWrapper,
		cc: cc,
		bcc: bcc,
	});

	console.log("Message sent: " + info.messageId);
};

const diligenceApproval = async (name, email, approved, cc) => {
	const mainBody = `<!-- START MAIN CONTENT AREA -->
    <tr>
      <td class="wrapper">
      <p>Dear ${name},</p>
      <p>Your Green Bond request has been ${
			approved
				? "successfully approved by Diligence and is now open for subscription."
				: "rejected by Diligence."
		}.</p>
      <p>Thanks,<br/>Team Project iGreen</p>  
      </td>
    </tr>`;

	const info = await transporter.sendMail({
		from: "Dygnify Ventures <hello@dygnify.com>",
		to: email,
		subject: "Project iGreen - Bond proposal Diligence approval",
		html: startEmailWrapper + mainBody + endEmailWrapper,
		cc: cc,
		bcc: bcc,
	});

	console.log("Message sent: " + info.messageId);
};

const bondAvailableForSubscription = async (name, email, bondName, cc) => {
	const mainBody = `<!-- START MAIN CONTENT AREA -->
    <tr>
      <td class="wrapper">
      <p>Dear ${name},</p>
      <p>The Green bond ${bondName} is available for subscription.<br/>Please login to access details and subscribe..
      </p>
      <p>Thanks,<br/>Team Project iGreen</p>  
      </td>
    </tr>`;

	const info = await transporter.sendMail({
		from: "Dygnify Ventures <hello@dygnify.com>",
		to: email,
		subject: "Project iGreen - Green Bond available for subscription",
		html: startEmailWrapper + mainBody + endEmailWrapper,
		cc: cc,
		bcc: bcc,
	});

	console.log("Message sent: " + info.messageId);
};

const fullSubscription = async (name, email, cc, bondName) => {
	const mainBody = `<!-- START MAIN CONTENT AREA -->
    <tr>
      <td class="wrapper">
      <p>Dear ${name},</p>
      <p>The Green bond ${bondName} has been fully subscribed.</p>
      <p>Thanks,<br/>Team Project iGreen</p>  
      </td>
    </tr>`;

	const info = await transporter.sendMail({
		from: "Dygnify Ventures <hello@dygnify.com>",
		to: email,
		subject: "Project iGreen - Green Bond subscribed",
		html: startEmailWrapper + mainBody + endEmailWrapper,
		cc: cc,
		bcc: bcc,
	});

	console.log("Message sent: " + info.messageId);
};

const tokenizeBond = async (name, email, cc, bondName) => {
	const mainBody = `<!-- START MAIN CONTENT AREA -->
    <tr>
      <td class="wrapper">
      <p>Dear ${name},</p>
      <p>The Green bond ${bondName} has been successfully tokenized and allotted.</p>
      <p>Thanks,<br/>Team Project iGreen</p>  
      </td>
    </tr>`;

	const info = await transporter.sendMail({
		from: "Dygnify Ventures <hello@dygnify.com>",
		to: email,
		subject: "Project iGreen - Green Bond tokenized and allotted",
		html: startEmailWrapper + mainBody + endEmailWrapper,
		cc: cc,
		bcc: bcc,
	});

	console.log("Message sent: " + info.messageId);
};

const repayment = async (
	name,
	email,
	cc,
	bondName,
	dueAmount,
	repaymentDate
) => {
	const mainBody = `<!-- START MAIN CONTENT AREA -->
    <tr>
      <td class="wrapper">
      <p>Dear ${name},</p>
      <p>The Green bond ${bondName} repayment of ${dueAmount} has been done on ${repaymentDate}. Kindly distribute repayment funds to subscribers.</p>
      <p>Thanks,<br/>Team Project iGreen</p>  
      </td>
    </tr>`;

	const info = await transporter.sendMail({
		from: "Dygnify Ventures <hello@dygnify.com>",
		to: email,
		subject: "Project iGreen - Green Bond repayment done",
		html: startEmailWrapper + mainBody + endEmailWrapper,
		cc: cc,
		bcc: bcc,
	});

	console.log("Message sent: " + info.messageId);
};

const distributePay = async (
	name,
	email,
	cc,
	bondName,
	dueAmount,
	repaymentDate
) => {
	const mainBody = `<!-- START MAIN CONTENT AREA -->
    <tr>
      <td class="wrapper">
      <p>Dear ${name},</p>
      <p>The Green bond ${bondName} repayment of ${dueAmount} has been distributed on ${repaymentDate}. Kindly check your dashboard for details.</p>
      <p>Thanks,<br/>Team Project iGreen</p>  
      </td>
    </tr>`;

	const info = await transporter.sendMail({
		from: "Dygnify Ventures <hello@dygnify.com>",
		to: email,
		subject: "Project iGreen - Green Bond repayment distribution done",
		html: startEmailWrapper + mainBody + endEmailWrapper,
		cc: cc,
		bcc: bcc,
	});

	console.log("Message sent: " + info.messageId);
};

const matureBond = async (name, email, cc, bondName, date) => {
	const mainBody = `<!-- START MAIN CONTENT AREA -->
    <tr>
      <td class="wrapper">
      <p>Dear ${name},</p>
      <p>The Green bond ${bondName} has matured and closed on ${date}.</p>
      <p>Thanks,<br/>Team Project iGreen</p>  
      </td>
    </tr>`;

	const info = await transporter.sendMail({
		from: "Dygnify Ventures <hello@dygnify.com>",
		to: email,
		subject: "Project iGreen - Green Bond matured",
		html: startEmailWrapper + mainBody + endEmailWrapper,
		cc: cc,
		bcc: bcc,
	});

	console.log("Message sent: " + info.messageId);
};

module.exports = {
	userRegistration,
	createProfile,
	completeKyc,
	borrowRequestCreation,
	adminApproval,
	diligenceApproval,
	bondAvailableForSubscription,
	fullSubscription,
	tokenizeBond,
	repayment,
	distributePay,
	matureBond,
};
