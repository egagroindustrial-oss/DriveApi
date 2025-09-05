import { CacheManager } from "./CacheManager";
import { ConfigManger } from "./config/ConfigManger";
import { DriveManager } from "./DriveManager";
import {
  RouteExecute,
  RouteInsertToQueue,
  RouteIsReady,
  RouterManager,
  RouteSetConfig,
} from "./methods";
import { RouteAppConfig } from "./methods/getAppConfig";
import { RouteGetImage } from "./methods/getImage";
import { RouteGetUser } from "./methods/getUser";
import { RouteLogin } from "./methods/login";
import { Body } from "./methods/Route";
import { QueueManager } from "./QueueManager";
import { RequestLock } from "./RequestLock/RequestLock";
import { SessionManager } from "./SessionManager/sessionManager";
import { SheetManager } from "./SheetManager";
import { Format1 } from "./templates/Format1";
import { TriggerManager } from "./TriggerManager/TriggerManager";

function doPost(e: any) {
  if (Object.keys(ConfigManger.getConfig()).length == 0) init();
  const requestId = `req_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  try {
    const body = e.postData.contents;
    const bodyJson = JSON.parse(body) as Body;

    const unlockData = RouterManager.executeRoute(bodyJson, requestId, [
      RouteIsReady,
      RouteGetUser,
      RouteLogin,
      RouteGetImage,
      RouteAppConfig,
    ]);

    if (unlockData) {
      return unlockData;
    }

    if (!RequestLock.acquireLock(requestId)) {
      return ContentService.createTextOutput(
        JSON.stringify({
          error: "Request timeout",
          message: "Could not acquire lock within timeout period",
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const data = RouterManager.executeRoute(bodyJson, requestId, [
      RouteExecute,
      RouteSetConfig,
      RouteInsertToQueue,
    ]);

    if (data) {
      RequestLock.releaseLock(requestId);
      return data;
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        error: "Invalid request type",
        requestId: requestId,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    RequestLock.releaseLock(requestId);
    RequestLock.setIsReady(true);
    return ContentService.createTextOutput(
      JSON.stringify({
        error: "Internal error",
        message: (error as string).toString(),
        requestId: requestId,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function triggerFunc() {
  SessionManager.clearExpiredSessions();
  QueueManager.ProcessQueue.processQueue(ConfigManger.getConfig());
}

function init() {
  ConfigManger.setProperty({
    folderName: "data",
    headers: ["inicio", "horas", "razón", "estado"],
    usersSpreadsheet: "capitanes_data",
    usersSheet: "Capitanes",
    passwordSheet: "Contraseña",
    imagesFolder: "imagenes_capitanes",
    headerFormats: {
      1: {
        numberFormat: "[h]:mm:ss",
      },
      3: {
        conditionalRules: [
          {
            type: "textIsEmpty",
            background: "white",
          },
          {
            type: "textEqualTo",
            value: "trabajando",
            background: "#41B451",
          },
          {
            type: "textEqualTo",
            value: "horas extra",
            background: "#41B451",
          },
          {
            type: "textEqualTo",
            value: "fin jornada",
            background: "#389FBE",
          },
          {
            type: "textEqualTo",
            value: "no trabajando",
            background: "#3855be",
          },
          {
            type: "notEqualTo",
            value: "trabajando",
            background: "#AA3636",
          },
        ],
      },
      2: {
        conditionalRules: [
          {
            type: "textIsEmpty",
            background: "white",
          },
          {
            type: "textEqualTo",
            value: " ",
            background: "#cccccc",
          },
        ],
      },
    },
    rowFormulas: {
      fin: "=A2",
      horas: "=IF(OR(ISBLANK(A1); ISBLANK(A2)); 0; A2 - A1)",
    },
    formulasFormat: {
      "horas trabajadas": {
        numberFormat: "[h]:mm:ss",
      },
      falta_matriales: {
        numberFormat: "[h]:mm:ss",
      },
      translado_interno: {
        numberFormat: "[h]:mm:ss",
      },
      problemas_climaticos: {
        numberFormat: "[h]:mm:ss",
      },
      almuerzo: {
        numberFormat: "[h]:mm:ss",
      },
      charlas: {
        numberFormat: "[h]:mm:ss",
      },
      pausas: {
        numberFormat: "[h]:mm:ss",
      },
      "no trabajando": {
        numberFormat: "[h]:mm:ss",
      },
      "Cambio de formato": {
        numberFormat: "[h]:mm:ss",
      },
      total_paros: {
        numberFormat: "[h]:mm:ss",
      },
    },
    formulas: {
      "horas trabajadas": '=SUMIF(D2:D, "trabajando", B2:B)',
      "no trabajando": '=SUMIF(D2:D, "no trabajando", B2:B)',
      falta_matriales: '=SUMIF(D2:D, "materiales", B2:B)',
      translado_interno: '=SUMIF(D2:D, "traslado interno", B2:B)',
      problemas_climaticos: '=SUMIF(D2:D, "problemas climaticos", B2:B)',
      almuerzo: '=SUMIF(D2:D, "almuerzo", B2:B)',
      charlas: '=SUMIF(D2:D, "charla", B2:B)',
      pausas: '=SUMIF(D2:D, "pausa activa", B2:B)',
      "Cambio de formato": '=SUMIF(D2:D, "Cambio de formato", B2:B)',
      total_paros: "=SUM(E3:E11)",
    },
    appConfig: {
      buttons: [
        { label: "Almuerzo", value: "almuerzo" },
        { label: "Falta de materiales", value: "materiales" },
        { label: "Traslados internos", value: "traslado interno" },
        { label: "Causas climatológicas", value: "problemas climaticos" },
        { label: "Charlas & Reuniones", value: "charla" },
        { label: "Pausas Activas", value: "pausa activa" },
        { label: "Cambio de formato", value: "Cambio de formato" },
      ],

      select_options: [
        { label: "N°1", value: "1" },
        { label: "N°2", value: "2" },
        { label: "N°3", value: "3" },
        { label: "N°4", value: "4" },
        { label: "N°5", value: "5" },
        { label: "N°6", value: "6" },
      ],
      messages: {
        almuerzo: {
          title: "¡Disfruta del almuerzo, Capitán!",
          message: `Recargar energías es la mejor inversión
para una tarde productiva.
¡Te esperamos!`,
        },
        materiales: {
          title: "¡Material en camino, Capitán!",
          message: `En unos minutos tu equipo volverá
a la acción con todo lo necesario.`,
        },
        charla: {
          title: "¡Un momento de estrategia, Capitán!",
          message: `Tu equipo está planificando los siguientes pasos. La comunicación es la base del éxito.`,
        },
        "Cambio de formato": {
          title: "¡Cambio de formato, Capitán!",
          message: `El equipo está ajustándose para cosechar el nuevo producto. 
¡La versatilidad es nuestra fortaleza!`,
        },
        "traslado interno": {
          title: "¡En movimiento, Capitán!",
          message: `El equipo se está trasladando. 
¡La productividad no se detiene!`,
        },
        "problemas climaticos": {
          title: "¡Una breve pausa, Capitán!",
          message: `El clima manda en el campo, 
pero el equipo está listo para continuar 
en cuanto el cielo lo permita.`,
        },
        "pausa activa": {
          title: `Recuerda, Capitán: 
¡Cuerpo sano, mente sana!`,
          message: `El equipo está en su pausa activa. Unos minutos 
de estiramiento y a seguir con la jornada.`,
        },
      },
    },
  });

  ConfigManger.processOperation({
    time: 1,
    operation: "initProcessQueueTrigger",
  });
}

function clearCache() {
  DriveManager.cache.clearCache();
  SheetManager.cache.clearCache();
  QueueManager.cache.clearCache();
  QueueManager.Queue.clearQueue();
  TriggerManager.deleteAllTriggers();
  ConfigManger.clearConfig();
  Format1.restoreFormta1Memory();
  RequestLock.clearCache();
  SessionManager.clearCache();
  CacheManager.clearAllCache();
}
