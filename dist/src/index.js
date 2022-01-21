import { __assign, __awaiter, __generator } from "tslib";
import 'react-native-get-random-values';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";
import { Platform, Dimensions } from "react-native";
import { Buffer } from "buffer";
import { v4 as uuidv4 } from 'uuid';
var _a = Dimensions.get("window"), width = _a.width, height = _a.height;
var MIXPANEL_API_URL = "https://api.mixpanel.com";
var ASYNC_STORAGE_KEY = "mixpanel:super:props";
var isIosPlatform = Platform.OS === "ios";
function getExistingUUID() {
    return __awaiter(this, void 0, void 0, function () {
        var existingUUID;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, SecureStore.getItemAsync('secure_deviceid')];
                case 1:
                    existingUUID = _a.sent();
                    return [2, existingUUID];
            }
        });
    });
}
function setExistingUUID(newUuid) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, SecureStore.setItemAsync('secure_deviceid', JSON.stringify(newUuid))];
                case 1:
                    _a.sent();
                    return [2];
            }
        });
    });
}
var ExpoMixpanelAnalytics = (function () {
    function ExpoMixpanelAnalytics(token) {
        var _this = this;
        this.ready = false;
        this.superProps = {};
        getExistingUUID()
            .then(function (uuid) {
            if (uuid) {
                _this.clientId = uuid;
                return;
            }
            var newUuid = uuidv4();
            var newUuidString = JSON.stringify(newUuid);
            _this.clientId = newUuidString;
            setExistingUUID(newUuidString)
                .then()
                .catch(function (error) { return console.log(error); });
        })
            .catch(function (error) { return console.log(error); });
        this.ready = false;
        this.queue = [];
        this.token = token;
        this.userId = null;
        this.osVersion = Platform.Version;
        this.superProps;
        Constants.getWebViewUserAgentAsync().then(function (userAgent) {
            var _a, _b, _c;
            _this.userAgent = userAgent;
            _this.appName = (_a = Constants.manifest) === null || _a === void 0 ? void 0 : _a.name;
            _this.appId = (_b = Constants.manifest) === null || _b === void 0 ? void 0 : _b.slug;
            _this.appVersion = (_c = Constants.manifest) === null || _c === void 0 ? void 0 : _c.version;
            _this.screenSize = width + "x" + height;
            if (isIosPlatform && Constants.platform && Constants.platform.ios) {
                _this.platform = Constants.platform.ios.platform;
                _this.model = Device.modelName;
            }
            else {
                _this.platform = "android";
            }
            AsyncStorage.getItem(ASYNC_STORAGE_KEY, function (_, result) {
                if (result) {
                    try {
                        _this.superProps = JSON.parse(result) || {};
                    }
                    catch (_a) { }
                }
                _this.ready = true;
                _this.identify(_this.clientId);
                _this._flush();
            });
        });
    }
    ExpoMixpanelAnalytics.prototype.register = function (props) {
        this.superProps = props;
        try {
            AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(props));
        }
        catch (_a) { }
    };
    ExpoMixpanelAnalytics.prototype.alias = function (alias) {
        this.queue.push({
            name: '$create_alias',
            props: {
                alias: alias,
            }
        });
        this._flush();
    };
    ExpoMixpanelAnalytics.prototype.track = function (name, props) {
        this.queue.push({
            name: name,
            props: props
        });
        this._flush();
    };
    ExpoMixpanelAnalytics.prototype.identify = function (userId) {
        this.userId = userId;
    };
    ExpoMixpanelAnalytics.prototype.reset = function () {
        this.identify(this.clientId);
        try {
            AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify({}));
        }
        catch (_a) { }
    };
    ExpoMixpanelAnalytics.prototype.people_set = function (props) {
        this._people("set", props);
    };
    ExpoMixpanelAnalytics.prototype.people_set_once = function (props) {
        this._people("set_once", props);
    };
    ExpoMixpanelAnalytics.prototype.people_unset = function (props) {
        this._people("unset", props);
    };
    ExpoMixpanelAnalytics.prototype.people_increment = function (props) {
        this._people("add", props);
    };
    ExpoMixpanelAnalytics.prototype.people_append = function (props) {
        this._people("append", props);
    };
    ExpoMixpanelAnalytics.prototype.people_union = function (props) {
        this._people("union", props);
    };
    ExpoMixpanelAnalytics.prototype.people_delete_user = function () {
        this._people("delete", "");
    };
    ExpoMixpanelAnalytics.prototype._flush = function () {
        if (this.ready) {
            var _loop_1 = function () {
                var event_1 = this_1.queue.pop();
                this_1._pushEvent(event_1).then(function () { return (event_1.sent = true); });
            };
            var this_1 = this;
            while (this.queue.length) {
                _loop_1();
            }
        }
    };
    ExpoMixpanelAnalytics.prototype._people = function (operation, props) {
        if (this.userId) {
            var data = {
                $token: this.token,
                $distinct_id: this.userId
            };
            data["$" + operation] = props;
            this._pushProfile(data);
        }
    };
    ExpoMixpanelAnalytics.prototype._pushEvent = function (event) {
        var data = {
            event: event.name,
            properties: __assign(__assign({}, (event.props || {})), this.superProps)
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
        var buffer = new Buffer(JSON.stringify(data)).toString("base64");
        var isIdentityAPI = event.name === '$create_alias' ? '#identity-create-alias' : '';
        return fetch(MIXPANEL_API_URL + "/track" + isIdentityAPI + "/?data=" + buffer);
    };
    ExpoMixpanelAnalytics.prototype._pushProfile = function (data) {
        data = new Buffer(JSON.stringify(data)).toString("base64");
        return fetch(MIXPANEL_API_URL + "/engage/?data=" + data);
    };
    return ExpoMixpanelAnalytics;
}());
export { ExpoMixpanelAnalytics };
export default ExpoMixpanelAnalytics;
//# sourceMappingURL=index.js.map