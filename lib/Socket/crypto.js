const crypto = require("crypto");

exports.sha256 = (data) => {
    return crypto.createHash("sha256").update(data).digest();
};
