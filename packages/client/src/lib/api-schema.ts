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
                        isUp: boolean;
                        /**
                         * @description May be null when a fetch error has occurred
                         * @example 200
                         */
                        statusCode: number | null;
                        /** @example 214.22672000000057 */
                        responseTimeMs: number;
                        /** @example null */
                        fetchError: string | null;
                        /** Format: date-time */
                        checkedAt: string;
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
}
