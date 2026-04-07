import { WebHaptics } from "web-haptics";

let instance: WebHaptics | null = null;

export function getHaptics(): WebHaptics {
  if (!instance) {
    instance = new WebHaptics();
  }
  return instance;
}
