import { isValidTimeZone } from "@/lib/reminder";
import { userRepository } from "@/server/repositories/user.repository";
import { ValidationError } from "@/server/errors";

/** Falls back to UTC rather than throwing if a user row somehow has no zone.
 * A reminder at the wrong hour is a bug worth fixing; a page that will not
 * render because of one is worse. */
const FALLBACK_TIMEZONE = "UTC";

export const userService = {
  async getTimezone(userId: string) {
    const user = await userRepository.findTimezone(userId);
    return user?.timezone ?? FALLBACK_TIMEZONE;
  },

  /**
   * Stores the person's timezone.
   *
   * Validated against the runtime's own timezone database rather than a regex,
   * because the only definition of a valid zone that matters is whether the
   * code that later formats times can resolve it. A string that passes a regex
   * but throws inside Intl would turn a background job into a crash loop that
   * nobody sees, since it runs when nobody is watching.
   *
   * Writes only on change, so a page load does not become a database write.
   */
  async setTimezone(input: { userId: string; timezone: string }) {
    if (!isValidTimeZone(input.timezone)) {
      throw new ValidationError("That isn't a timezone I recognise.");
    }

    const current = await userRepository.findTimezone(input.userId);
    if (current?.timezone === input.timezone) {
      return { timezone: input.timezone, changed: false };
    }

    const updated = await userRepository.setTimezone(
      input.userId,
      input.timezone,
    );
    return { timezone: updated.timezone, changed: true };
  },
};
