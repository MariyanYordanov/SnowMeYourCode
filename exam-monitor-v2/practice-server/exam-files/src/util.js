function parseError(err) {
    if (err instanceof Error) {
        if (!err.errors) {
            // Generic error
            err.errors = [err.message];
            return err; 
        } else {
            // Sequelize error
            const error = new Error('Input validation error');
            error.errors = Object.fromEntries(Object.values(err.errors).map(e => [e.path, e.message]));
            return error; 
        }
    } else if (Array.isArray(err)) {
        // Express-validator error
        const error = new Error('An error occurred');
        error.errors = Object.fromEntries(err.map(e => [e.path, e.msg]));
        return error; 
    } else {
        // Unknown error type
        const error = new Error('Unknown error type');
        error.errors = [err];
        return error;
    }
}

module.exports = { parseError };
