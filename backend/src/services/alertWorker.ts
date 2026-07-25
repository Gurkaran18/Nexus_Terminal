import cron from "node-cron"; // Time based scheduler
import Alert from "../models/Alert";

/**
 * Initializes and starts the background alert worker.
 * Runs every minute (* * * * *) to check for untriggered alerts.
 */
export const startAlertWorker = () => {
  console.log("⏰ Alert worker initialized. Checking conditions every minute.");

  cron.schedule("* * * * *", async () => {
    try {
      // Find all alerts that haven't been triggered yet
      const activeAlerts = await Alert.find({ isTriggered: false });

      if (activeAlerts.length === 0) {
        return; // Nothing to check
      }

      for (const alert of activeAlerts) {
        // Simulate checking the current price by generating a random price between 0 and 1000
        const currentPrice = +(Math.random() * 1000).toFixed(2);

        let isHit = false;

        if (alert.condition === "above" && currentPrice >= alert.targetPrice) {
          isHit = true;
        } else if (
          alert.condition === "below" &&
          currentPrice <= alert.targetPrice
        ) {
          isHit = true;
        }

        if (isHit) {
          console.log(
            `\n🚨 ALERT: [${alert.assetSymbol}] has hit target price for [${alert.userEmail}]! (Target: $${alert.targetPrice}, Current: $${currentPrice})`
          );

          // Update the alert in the database so it doesn't trigger again
          alert.isTriggered = true;
          await alert.save();
        }
      }
    } catch (error) {
      console.error("Error running alert worker:", error);
    }
  });
};
