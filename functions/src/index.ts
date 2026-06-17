import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as webpush from "web-push";

initializeApp();
const db = getFirestore();

// Configure VAPID keys for Web Push
webpush.setVapidDetails(
  "mailto:asmarasakti27@gmail.com",
  "BPlaOdWv-YzUwWH3KU9BxfzZrHG1JKg29YixlRANTZT2q8ucppU6RtIDKMdQmmcUtGnlq8wxBJZ5frQlAt1nBnU",
  "Rjq7KDutU9aDONejPovEMGt8rlBpO8_RdbvfvxbJ-ag"
);

/**
 * Scheduled Cloud Function running every minute to check and trigger task reminders
 */
export const checkTaskReminders = onSchedule("every 1 minutes", async (event) => {
  const now = new Date();
  const nowTime = now.getTime();
  logger.info("Executing scheduled task reminders check...", { time: now.toISOString() });

  try {
    // Query all incomplete tasks across all users
    const tasksSnap = await db.collectionGroup("tasks")
      .where("isCompleted", "==", false)
      .get();

    if (tasksSnap.empty) {
      logger.info("No incomplete pending tasks found.");
      return;
    }

    // Cache user settings to minimize read operations
    const userSettingsCache: Record<string, { reminderOffset?: number }> = {};

    for (const taskDoc of tasksSnap.docs) {
      const taskData = taskDoc.data();
      
      // Skip if task has already sent reminder
      if (taskData.reminderSent === true) {
        continue;
      }

      // Skip if task has no scheduled time
      if (!taskData.scheduledAt) {
        continue;
      }

      const taskId = taskDoc.id;
      const taskText = taskData.text || "Your task is due!";
      
      // Extract userId from path: users/{userId}/tasks/{taskId}
      const pathParts = taskDoc.ref.path.split("/");
      const userId = pathParts[1];

      let scheduledAtDate: Date;
      if (taskData.scheduledAt.toDate) {
        scheduledAtDate = taskData.scheduledAt.toDate();
      } else {
        scheduledAtDate = new Date(taskData.scheduledAt);
      }

      const scheduledTime = scheduledAtDate.getTime();

      // Fetch user settings with local cache
      if (!userSettingsCache[userId]) {
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data() || {};
          const settings = userData.settings || {};
          userSettingsCache[userId] = {
            reminderOffset: typeof settings.reminderOffset === "number" ? settings.reminderOffset : 0,
          };
        } else {
          userSettingsCache[userId] = { reminderOffset: 0 };
        }
      }

      const { reminderOffset } = userSettingsCache[userId];
      const reminderTime = scheduledTime - (reminderOffset || 0) * 60 * 1000;

      // Check if reminder time has arrived or passed
      if (reminderTime <= nowTime) {
        logger.info(`Triggering reminder for task ${taskId} (user: ${userId}). Scheduled: ${scheduledAtDate.toISOString()}, Offset: ${reminderOffset}m`);

        // Mark as sent immediately to prevent duplicate runs
        await taskDoc.ref.update({
          reminderSent: true,
          reminderSentAt: FieldValue.serverTimestamp()
        });

        // Fetch user's push subscriptions
        const subsSnap = await db.collection("users").doc(userId).collection("pushSubscriptions").get();
        if (subsSnap.empty) {
          logger.info(`No active push subscriptions found for user ${userId}.`);
          continue;
        }

        let notificationText = taskText;
        if (reminderOffset && reminderOffset > 0) {
          notificationText = `in ${reminderOffset} mins: ${taskText} 💅`;
        }

        const payload = JSON.stringify({
          title: "grind o'clock! ⚡️",
          body: notificationText,
          url: "/goals",
          tag: "task-reminder"
        });

        // Send push notifications
        const sendPromises = subsSnap.docs.map(async (subDoc) => {
          const subData = subDoc.data();
          
          if (!subData.endpoint || !subData.keys || !subData.keys.p256dh || !subData.keys.auth) {
            logger.warn(`Subscription ${subDoc.id} is malformed. Deleting...`);
            await subDoc.ref.delete().catch(() => {});
            return;
          }

          const subscription = {
            endpoint: subData.endpoint,
            keys: {
              p256dh: subData.keys.p256dh,
              auth: subData.keys.auth
            }
          };

          try {
            await webpush.sendNotification(subscription, payload);
            logger.info(`Push notification sent successfully to subscription ${subDoc.id}`);
          } catch (err: any) {
            logger.error(`Error sending push notification to subscription ${subDoc.id}:`, err);
            // Clean up invalid or expired subscription
            if (err.statusCode === 410 || err.statusCode === 404) {
              logger.info(`Subscription ${subDoc.id} is expired or gone. Deleting...`);
              await subDoc.ref.delete().catch((delErr) => {
                logger.error(`Failed to delete subscription ${subDoc.id}:`, delErr);
              });
            }
          }
        });

        await Promise.all(sendPromises);
      }
    }
  } catch (error) {
    logger.error("Error running task reminder check:", error);
  }
});
