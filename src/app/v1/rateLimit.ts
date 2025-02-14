import NodeCache from "node-cache";
import { RATE_LIMITS } from "./config";

const myCache = new NodeCache({
  // one day and it deletes the key-value pair
  stdTTL: 24 * 60 * 60,
  checkperiod: 120,
});

interface RLCount {
  minTimestamp: number;
  hourTimestamp: number;
  dayTimestamp: number;
  minCount: number;
  hourCount: number;
  dayCount: number;
}

function rateLimit(ip: string) {
  try {
    let a: RLCount | undefined = myCache.get(ip);
    if (!a) {
      const currentTimestamp = Date.now();
      a = {
        minCount: 1,
        hourCount: 1,
        dayCount: 1,
        minTimestamp: currentTimestamp,
        hourTimestamp: currentTimestamp,
        dayTimestamp: currentTimestamp,
      };
      myCache.set(ip, a);
      return { allow: true, message: "You can proceed with your request" };
    } 
    const currentTimestamp = Date.now();
    const differMin = (currentTimestamp - a.minTimestamp) / 1000;
    const differHour = (currentTimestamp - a.hourTimestamp) / 1000;
    const differDay = (currentTimestamp - a.dayTimestamp) / 1000;
    if (differMin > 60) {
      a.minTimestamp = currentTimestamp;
      a.minCount = 0;
    }
    if (differHour > 60 * 60) {
      a.hourTimestamp = currentTimestamp;
      a.hourCount = 0;
    }
    if (differDay > 60 * 60 * 24) {
      a.dayTimestamp = currentTimestamp;
      a.dayCount = 0;
    }
    a.hourCount++;
    a.minCount++;
    a.dayCount++;
    if (a.minCount > RATE_LIMITS.PER_MINUTE) {
      return {
        allow: false,
        message: `Max Rate Limiting Reached: ${RATE_LIMITS.PER_MINUTE} reqs/min`,
      };
    }
    if (a.hourCount > RATE_LIMITS.PER_HOUR) {
      return {
        allow: false,
        message: `Max Rate Limiting Reached: ${RATE_LIMITS.PER_HOUR} reqs/hour`,
      };
    }
    if (a.dayCount > RATE_LIMITS.PER_DAY) {
      return {
        allow: false,
        message: `Max Rate Limiting Reached: ${RATE_LIMITS.PER_DAY} reqs/day`,
      };
    }
    myCache.set(ip, a);
    // console.log(a);
    return { allow: true, message: "You can proceed with your request" };
  } catch (error) {
    console.error(error);
    return { allow: false, message: "Internal Server Error" };
  }
}

export { rateLimit };
