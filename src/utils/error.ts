
class ApiError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message); // Call the parent class (Error) constructor
        this.statusCode = statusCode;

        // Maintains proper stack trace for where the error was thrown (only in V8 environments like Node.js)
        Error.captureStackTrace(this, this.constructor);
    }

    toResponse() {
        return {
            status: "error",
            message: this.message,
            statusCode: this.statusCode,
        };
    }
}

export default ApiError;
