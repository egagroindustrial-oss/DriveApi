function testLogin() {
  const testEvent = {
    postData: {
      contents: JSON.stringify({
        type: "login",
        data: {
          dni: "88888888",
          password: "123123",
        },
      }),
    },
  };
  const result = doPost(testEvent);
  console.log("Resultado testLogin:", result);
  return result;
}
import { CacheManager } from "./lib/CacheManager";
import { config } from "./config";
import { ConfigManger } from "./config/ConfigManger";
import {
  RouteExecute,
  RouteInsertToQueue,
  /*   RouteIsReady, */
  RouterManager,
  RouteSetConfig,
} from "./methods";
import { RouteAppConfig } from "./methods/getAppConfig";
import { RouteGetImage } from "./methods/getImage";
import { RouteGetUser } from "./methods/getUser";
import { RouteLogin } from "./methods/login";
import { Body } from "./lib/Router/Route";
import { RequestLock } from "./lib/RequestLock/RequestLock";
import { SessionManager } from "./lib/SessionManager/sessionManager";
import { Format1 } from "./templates/Format1";
import { TriggerManager } from "./lib/TriggerManager/TriggerManager";
import { DriveManager } from "./lib/DriveManager";
import { QueueManager } from "./lib/QueueManager";
import { Queue } from "./lib/QueueManager/queue";
import { SheetManager } from "./lib/SheetManager";
import { FormulaProcessor } from "./lib/SheetManager/formula";
import { ProcessQueue } from "./processQueue";
import { CreateSummary } from "./createSummary";

function doPost(e: any) {
  if (Object.keys(ConfigManger.getConfig()).length == 0) init();
  const requestId = `req_${Date.now()}`;
  const body = e.postData.contents;
  const bodyJson = JSON.parse(body) as Body;

  //console.error(body);

  const unlockData = RouterManager.executeRoute(bodyJson, requestId, [
    /* RouteIsReady, */
    RouteGetUser,
    RouteLogin,
    RouteGetImage,
    RouteAppConfig,
  ]);

  if (unlockData) {
    return unlockData;
  }

  try {
    TriggerManager.createTrigger(1);
    if (!RequestLock.acquireLock(requestId)) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const data = RouterManager.executeRoute(bodyJson, requestId, [
      RouteExecute,
      RouteSetConfig,
      RouteInsertToQueue,
    ]);

    if (data) {
      return data;
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: "No action taken",
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: "No action taken",
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    RequestLock.releaseLock(requestId);
    //RequestLock.setIsReady(true);
  }
}

function init() {
  ConfigManger.setProperty(config);
  SheetManager.Spreadsheet.registerSpreadsheet(config.usersSpreadsheet);
  /*   ConfigManger.processOperation({
    time: 1,
    operation: "initProcessQueueTrigger",
  }); */
}

function testSummary() {
  CreateSummary.createSummarySheet();
}

function clearCache() {
  DriveManager.cache.clearCache();
  SheetManager.cache.clearCache();
  QueueManager.cache.clearCache();
  QueueManager.Queue.clearQueue();
  Queue.deleteIds();
  TriggerManager.deleteAllTriggers();
  ConfigManger.clearConfig();
  Format1.restoreFormta1Memory();
  RequestLock.clearCache();
  SessionManager.clearCache();
  CacheManager.clearAllCache();
  CreateSummary.clearCache();
  // PropertiesService.getScriptProperties().deleteProperty("summaryCreatedDate");
}

/* function hasCreatedSummaryToday(): boolean {
  const props = PropertiesService.getScriptProperties();
  const today = new Date().toISOString().slice(0, 10);
  return props.getProperty("summaryCreatedDate") === today;
}

function setSummaryCreatedToday() {
  const props = PropertiesService.getScriptProperties();
  const today = new Date().toISOString().slice(0, 10);
  props.setProperty("summaryCreatedDate", today);
} */

/* function isTime630(): boolean {
  const now = new Date();
  // 18:30 es 6:30 PM
  return now.getHours() >= 18 && now.getMinutes() >= 30;
} */

/* function isTime630() {
  // Crear un formateador fijo a la zona horaria de Lima
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    hour: "numeric",
    minute: "numeric",
    hour12: false, // usar formato 24 horas
  });

  // Obtener hora y minutos como números
  const parts = formatter.formatToParts(new Date());
  const hour = parseInt(
    (parts.find((p) => p.type === "hour") as { value: string }).value,
    10
  );
  const minute = parseInt(
    (parts.find((p) => p.type === "minute") as { value: string }).value,
    10
  );
  return false;

  return hour > 18 || (hour === 18 && minute >= 30);
} */

function triggerFunc() {
  const triggerId = `trigger_${Date.now()}`;
  if (!RequestLock.acquireLock(triggerId)) {
    console.log("Trigger detenido: lock ocupado por petición");
    return;
  }

  try {
    console.log(JSON.stringify(Queue.getQueue()));
    if (Queue.getQueue().length > 0) {
      ProcessQueue.processQueue(ConfigManger.getConfig());
    } else {
      console.log("Cola vacía");
    }
  } catch (error) {
    console.error("Error en triggerFunc:", error);
  } finally {
    RequestLock.releaseLock(triggerId);
  }

  if (CreateSummary.createSummarySheet()) {
    TriggerManager.deleteAllTriggers();
  }
  /* if (isTime630() && !hasCreatedSummaryToday()) {
    console.log("creando resumen a las 6:30");
    const config = ConfigManger.getConfig() as Record<string, any>;
    const usersSheet = config["usersSheet"];
    const usersSpreadsheet = config["usersSpreadsheet"];
    if (!usersSheet || !usersSpreadsheet) return;
    const spreadSheet =
      SheetManager.Spreadsheet.getSpreadSheet(usersSpreadsheet);
    if (!spreadSheet) return;
    const sheet = spreadSheet.getSheetByName(usersSheet);
    if (!sheet) return;
    sheet.getRange(2, 3, sheet.getLastRow(), 1).clearContent();
    ///---------------------------------------
    CreateSummary.createSummarySheet();
    setSummaryCreatedToday();
    console.log("Resumen creado a las 6:30");
  } */
}
