export interface paths {
    "/api/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["health"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/uptime": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["checkUrl"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/monitors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["MonitorsController_listMonitors"];
        put?: never;
        post: operations["MonitorsController_createMonitor"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/monitors/{monitorId}/run": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["MonitorsController_runMonitor"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/monitors/{monitorId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["MonitorsController_getMonitor"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: never;
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    health: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        statusCode?: 400;
                        /**
                         * @example [
                         *       "url must be a valid URL",
                         *       "name should not be empty"
                         *     ]
                         */
                        message?: string[];
                        /** @example Bad Request */
                        error?: string;
                    };
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        statusCode?: 429;
                        /** @example ThrottlerException: Too Many Requests */
                        message?: string;
                    };
                };
            };
        };
    };
    checkUrl: {
        parameters: {
            query: {
                /** @description Url to check if it's up */
                url: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: date-time */
                        checkedAt: string;
                        errorCode: string | null;
                        isUp: boolean;
                        /** @example 14.2841248 */
                        responseTimeMs: number;
                        statusCode: number | null;
                    };
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        statusCode?: 400;
                        /**
                         * @example [
                         *       "url must be a valid URL",
                         *       "name should not be empty"
                         *     ]
                         */
                        message?: string[];
                        /** @example Bad Request */
                        error?: string;
                    };
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        statusCode?: 429;
                        /** @example ThrottlerException: Too Many Requests */
                        message?: string;
                    };
                };
            };
        };
    };
    MonitorsController_listMonitors: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        id: string;
                        name: string;
                        /** Format: date-time */
                        createdAt: string | null;
                        /** Format: uri */
                        webPage: string;
                        ownedBy: string;
                        isUp: boolean | null;
                    }[];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        statusCode?: 400;
                        /**
                         * @example [
                         *       "url must be a valid URL",
                         *       "name should not be empty"
                         *     ]
                         */
                        message?: string[];
                        /** @example Bad Request */
                        error?: string;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example Unauthorized */
                        message: string;
                        /** @enum {number} */
                        statusCode: 401;
                    };
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        statusCode?: 429;
                        /** @example ThrottlerException: Too Many Requests */
                        message?: string;
                    };
                };
            };
        };
    };
    MonitorsController_createMonitor: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: uri */
                    webPage: string;
                    name: string;
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        id: string;
                        name: string;
                        /** Format: date-time */
                        createdAt: string | null;
                        /** Format: uri */
                        webPage: string;
                        ownedBy: string;
                        checks: {
                            /** Format: date-time */
                            checkedAt: string;
                            errorCode: string | null;
                            /** Format: uuid */
                            id: string;
                            isUp: boolean;
                            /** @example 14.2841248 */
                            responseTimeMs: number;
                            statusCode: number | null;
                        }[];
                    };
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        statusCode?: 400;
                        /**
                         * @example [
                         *       "url must be a valid URL",
                         *       "name should not be empty"
                         *     ]
                         */
                        message?: string[];
                        /** @example Bad Request */
                        error?: string;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example Unauthorized */
                        message: string;
                        /** @enum {number} */
                        statusCode: 401;
                    };
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        statusCode?: 429;
                        /** @example ThrottlerException: Too Many Requests */
                        message?: string;
                    };
                };
            };
        };
    };
    MonitorsController_runMonitor: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                monitorId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        id: string;
                        name: string;
                        /** Format: date-time */
                        createdAt: string | null;
                        /** Format: uri */
                        webPage: string;
                        ownedBy: string;
                        checks: {
                            /** Format: date-time */
                            checkedAt: string;
                            errorCode: string | null;
                            /** Format: uuid */
                            id: string;
                            isUp: boolean;
                            /** @example 14.2841248 */
                            responseTimeMs: number;
                            statusCode: number | null;
                        }[];
                    };
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        statusCode?: 400;
                        /**
                         * @example [
                         *       "url must be a valid URL",
                         *       "name should not be empty"
                         *     ]
                         */
                        message?: string[];
                        /** @example Bad Request */
                        error?: string;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example Unauthorized */
                        message: string;
                        /** @enum {number} */
                        statusCode: 401;
                    };
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        statusCode?: 429;
                        /** @example ThrottlerException: Too Many Requests */
                        message?: string;
                    };
                };
            };
        };
    };
    MonitorsController_getMonitor: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                monitorId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        id: string;
                        name: string;
                        /** Format: date-time */
                        createdAt: string | null;
                        /** Format: uri */
                        webPage: string;
                        ownedBy: string;
                        checks: {
                            /** Format: date-time */
                            checkedAt: string;
                            errorCode: string | null;
                            /** Format: uuid */
                            id: string;
                            isUp: boolean;
                            /** @example 14.2841248 */
                            responseTimeMs: number;
                            statusCode: number | null;
                        }[];
                    };
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        statusCode?: 400;
                        /**
                         * @example [
                         *       "url must be a valid URL",
                         *       "name should not be empty"
                         *     ]
                         */
                        message?: string[];
                        /** @example Bad Request */
                        error?: string;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example Unauthorized */
                        message: string;
                        /** @enum {number} */
                        statusCode: 401;
                    };
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        statusCode?: 429;
                        /** @example ThrottlerException: Too Many Requests */
                        message?: string;
                    };
                };
            };
        };
    };
}
