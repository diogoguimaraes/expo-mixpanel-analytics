import 'react-native-get-random-values';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";
import { Platform, Dimensions } from "react-native";
import { Buffer } from "buffer";
import { v4 as uuidv4 } from 'uuid';

const { width, height } = Dimensions.get("window");

const MIXPANEL_API_URL = "https://api.mixpanel.com";
const ASYNC_STORAGE_KEY = "mixpanel:super:props";

async function getExistingUUID() {
  const existingUUID = await SecureStore.getItemAsync('secure_deviceid');

  return existingUUID;
}

async function setExistingUUID(newUuid) {
  await SecureStore.setItemAsync('secure_deviceid', JSON.stringify(newUuid));
}

export class ExpoMixpanelAnalytics {
  ready = false;
  token: string;
  userId?: string | null;
  clientId?: string;
  userAgent?: string | null;
  appName?: string;
  appId?: string;
  appVersion?: string;
  screenSize?: string;
  platform?: string;
  model?: string | null;
  osVersion: string | number;
  queue: any[];
  superProps: any = {};

  constructor(token) {
    getExistingUUID()
        .then((uuid) => {
          if (uuid) {
            this.clientId = uuid;

            return;
          }

          const newUuid = uuidv4();
          const newUuidString = JSON.stringify(newUuid);

          this.clientId = newUuidString;

          setExistingUUID(newUuidString)
            .then()
            .catch((error) => console.log(error));
        })
        .catch((error) => console.log(error));
  
    this.ready = false;
    this.queue = [];
    this.token = token;
    this.userId = null;
    this.osVersion = Platform.Version;
    this.superProps;

    Constants.getWebViewUserAgentAsync().then(userAgent => {
      this.userAgent = userAgent;
      this.appName = Constants.manifest?.name;
      this.appId = Constants.manifest?.slug;
      this.appVersion = Constants.manifest?.version;
      this.screenSize = `${width}x${height}`;
      this.platform = Device.modelId;
      this.model = Device.modelName;

      AsyncStorage.getItem(ASYNC_STORAGE_KEY, (_, result) => {
        if (result) {
          try {
            this.superProps = JSON.parse(result) || {};
          } catch {}
        }

        this.ready = true;
        
        this.identify(this.clientId);
        this._flush();
      });
    });
  }

  register(props: any) {
    this.superProps = props;
    try {
      AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(props));
    } catch {}
  }

  alias(alias: string) {
    this.queue.push({
      name: '$create_alias',
      props: {
        alias,
      }
    });

    this._flush();
  }

  track(name: string, props?: any) {
    this.queue.push({
      name,
      props
    });

    this._flush();
  }

  identify(userId?: string) {
    this.userId = userId;
  }

  reset() {
    this.identify(this.clientId);

    try {
      AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify({}));
    } catch {}
  }

  people_set(props) {
    this._people("set", props);
  }

  people_set_once(props) {
    this._people("set_once", props);
  }

  people_unset(props) {
    this._people("unset", props);
  }

  people_increment(props) {
    this._people("add", props);
  }

  people_append(props) {
    this._people("append", props);
  }

  people_union(props) {
    this._people("union", props);
  }

  people_delete_user() {
    this._people("delete", "");
  }

  // ===========================================================================================

  _flush() {
    if (this.ready) {
      while (this.queue.length) {
        const event = this.queue.pop();
        this._pushEvent(event).then(() => (event.sent = true));
      }
    }
  }

  _people(operation, props) {
    if (this.userId) {
      const data = {
        $token: this.token,
        $distinct_id: this.userId
      };
      data[`$${operation}`] = props;

      this._pushProfile(data);
    }
  }

  _pushEvent(event) {
    let data = {
      event: event.name,
      properties: {
        ...(event.props || {}),
        ...this.superProps
      }
    };

    if (this.userId) {
      data.properties.distinct_id = this.userId;
    }

    data.properties.token = this.token;
    data.properties.user_agent = this.userAgent;
    data.properties.app_name = this.appName;
    data.properties.app_id = this.appId;
    data.properties.app_version = this.appVersion;
    data.properties.screen_size = this.screenSize;
    data.properties.client_id = this.clientId;

    if (this.platform) {
      data.properties.platform = this.platform;
    }

    if (this.model) {
      data.properties.model = this.model;
    }

    if (this.osVersion) {
      data.properties.os_version = this.osVersion;
    }

    const buffer = new Buffer(JSON.stringify(data)).toString("base64");
    const isIdentityAPI = event.name === '$create_alias' ? '#identity-create-alias' : '';

    return fetch(`${MIXPANEL_API_URL}/track${isIdentityAPI}/?data=${buffer}`);
  }

  _pushProfile(data) {
    data = new Buffer(JSON.stringify(data)).toString("base64");
    return fetch(`${MIXPANEL_API_URL}/engage/?data=${data}`);
  }
}

export default ExpoMixpanelAnalytics;
