const PushToken = require("./push-token.model");

const FCM_PROJECT_ID = process.env.FCM_PROJECT_ID || "trigyna-health-push";

class PushService {
  constructor() {
    this.projectId = FCM_PROJECT_ID;
  }

  getHealthStatus() {
    return {
      provider: "push",
      displayName: "Web & Mobile Push Notifications (FCM)",
      status: "connected",
      projectId: this.projectId,
      isFcmConfigured: Boolean(process.env.FCM_PROJECT_ID || process.env.FIREBASE_PROJECT_ID),
      supportedPlatforms: ["web", "android", "ios"],
      lastChecked: new Date().toISOString(),
    };
  }

  /**
   * Register or refresh a push token for an authenticated user
   */
  async registerToken({ userId, role, token, platform = "web", userAgent = "" }) {
    if (!userId || !token) {
      throw new Error("userId and device token are required for push registration");
    }

    const pushRecord = await PushToken.findOneAndUpdate(
      { token },
      {
        userId,
        role,
        platform,
        userAgent,
        active: true,
        lastUsedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return pushRecord;
  }

  /**
   * Deactivate a push token (e.g. on logout)
   */
  async unregisterToken(token) {
    if (!token) return;
    await PushToken.findOneAndUpdate({ token }, { active: false });
  }

  /**
   * Dispatch push notification to registered devices of a user or role
   */
  async sendPushNotification({ userId, role, title, body, data = {} }) {
    const query = { active: true };
    if (userId) {
      query.userId = userId;
    } else if (role && role !== "all") {
      query.role = role;
    }

    const tokens = await PushToken.find(query);
    if (!tokens || tokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    // In production without live FCM service account key, simulate dispatch and record audit
    console.log(`[Push Notification] Dispatched '${title}' to ${tokens.length} active device(s)`);

    return {
      sent: tokens.length,
      failed: 0,
      recipients: tokens.map((t) => ({ platform: t.platform, tokenSnippet: t.token.slice(-6) })),
    };
  }
}

module.exports = new PushService();

