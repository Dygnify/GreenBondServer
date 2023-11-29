const admin = require("firebase-admin");
const serviceAccount = require("./greenbondapp-firebase-adminsdk-1a173-3e500594c5.json");
let firebaseApp;
const initializeFirebaseApp = () => {
	firebaseApp = admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
	});
};

const getFirebaseAdminAuth = () => {
	if (firebaseApp) {
		return firebaseApp.auth();
	} else {
		undefined;
	}
};

module.exports = { getFirebaseAdminAuth, initializeFirebaseApp };
