// firebaseAuth.ts
import { JWT } from "google-auth-library";
import axios from "axios";
import path from "path";

// Path to Firebase service account key
const serviceAccount = path.join(__dirname, "grip-service-account.json");

// FCM endpoint
const FCM_ENDPOINT =
  "https://fcm.googleapis.com/v1/projects/grip-34662/messages:send";

// Initialize JWT client
const client = new JWT({
  keyFile: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
});

async function sendPushNotification(
  token: string,
  title: string,
  body: string
) {
  if (!token || !title || !body) {
    console.error("Token, title, and body are required.");
    return false;
  }

  try {
    const { token: accessToken } = await client.getAccessToken();
    if (!accessToken) throw new Error("Unable to get access token");

    const message = {
      message: {
        token,
        notification: { title, body },
        data: { key1: "value1", key2: "value2" },
      },
    };

    const response = await axios.post(FCM_ENDPOINT, message, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    // console.log("✅ Notification sent:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "❌ Error sending notification:",
      error?.response?.data || error.message
    );
    return false;
  }
}

export default { sendPushNotification };
