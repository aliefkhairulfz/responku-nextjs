type HttpExceptionOptions = {
    message?: string
    errors?: Record<string, unknown>
}

/**
 * Base HTTP Exception class.
 * All custom HTTP exceptions should extend this class to ensure consistent error handling
 * across the application, especially in Next.js Route Handlers.
 */
export class HttpException extends Error {
    readonly statusCode: number
    readonly errors: Record<string, unknown>

    constructor(statusCode: number, options: HttpExceptionOptions = {}) {
        super(options.message ?? "An error occurred")

        this.name = "HttpException"
        this.statusCode = statusCode
        this.errors = options.errors ?? {}

        Error.captureStackTrace(this, this.constructor)
    }
}

export class BadRequestException extends HttpException {
    constructor(message = "Bad Request", errors: Record<string, unknown> = {}) {
        super(422, {
            message,
            errors,
        })
    }
}

export class UnauthorizedException extends HttpException {
    constructor(message = "Unauthorized", errors: Record<string, unknown> = {}) {
        super(401, {
            message,
            errors,
        })
    }
}

export class ForbiddenException extends HttpException {
    constructor(message = "Forbidden", errors: Record<string, unknown> = {}) {
        super(403, {
            message,
            errors,
        })
    }
}

export class NotFoundException extends HttpException {
    constructor(message = "Not Found", errors: Record<string, unknown> = {}) {
        super(404, {
            message,
            errors,
        })
    }
}

export class ConflictException extends HttpException {
    constructor(message = "Conflict", errors: Record<string, unknown> = {}) {
        super(409, {
            message,
            errors,
        })
    }
}

export class InternalServerErrorException extends HttpException {
    constructor(message = "Internal Server Error", errors: Record<string, unknown> = {}) {
        super(500, {
            message,
            errors,
        })
    }
}

export class MethodNotAllowedException extends HttpException {
    constructor(message = "Method Not Allowed", errors: Record<string, unknown> = {}) {
        super(405, {
            message,
            errors,
        })
    }
}

export class NotAcceptableException extends HttpException {
    constructor(message = "Not Acceptable", errors: Record<string, unknown> = {}) {
        super(406, {
            message,
            errors,
        })
    }
}

export class RequestTimeoutException extends HttpException {
    constructor(message = "Request Timeout", errors: Record<string, unknown> = {}) {
        super(408, {
            message,
            errors,
        })
    }
}

export class GoneException extends HttpException {
    constructor(message = "Gone", errors: Record<string, unknown> = {}) {
        super(410, {
            message,
            errors,
        })
    }
}

export class UnprocessableEntityException extends HttpException {
    constructor(message = "Unprocessable Entity", errors: Record<string, unknown> = {}) {
        super(422, {
            message,
            errors,
        })
    }
}

export class TooManyRequestsException extends HttpException {
    constructor(message = "Too Many Requests", errors: Record<string, unknown> = {}) {
        super(429, {
            message,
            errors,
        })
    }
}

export class NotImplementedException extends HttpException {
    constructor(message = "Not Implemented", errors: Record<string, unknown> = {}) {
        super(501, {
            message,
            errors,
        })
    }
}

export class BadGatewayException extends HttpException {
    constructor(message = "Bad Gateway", errors: Record<string, unknown> = {}) {
        super(502, {
            message,
            errors,
        })
    }
}

export class ServiceUnavailableException extends HttpException {
    constructor(message = "Service Unavailable", errors: Record<string, unknown> = {}) {
        super(503, {
            message,
            errors,
        })
    }
}

export class GatewayTimeoutException extends HttpException {
    constructor(message = "Gateway Timeout", errors: Record<string, unknown> = {}) {
        super(504, {
            message,
            errors,
        })
    }
}
