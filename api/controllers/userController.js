const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const User = mongoose.model('Users');

const {
    sendError,
    ACCESS_DENIED,
    UNAUTHORIZED,
    NOT_FOUND
} = require('./errorController');

exports.createUser = function (req, res) {
    var newUser = new User(req.body);
    newUser.save(function (err) {

        // TODO: duplicate email error
        if (err) {
            res.send(err);
        } else {
            req.session.authenticated = true;
            req.session.email = req.body.email;
            const token = jwt.sign({
                email: req.body.email
            }, process.env.JWT_SECRET);

            res.json({
                email: req.body.email,
                token
            });
        }
    });
};

exports.login = function (req, res) {
    User.findOne({
        email: req.body.email
    }).then((user) => {
        if (user == null) {
            throw 'Auth failed';
        }

        return user.comparePassword(req.body.password);
    }).then((isMatch) => {
        if (isMatch) {
            req.session.authenticated = true;
            req.session.email = req.body.email;
            const token = jwt.sign({
                email: req.body.email
            }, process.env.JWT_SECRET);
            res.json({
                email: req.body.email,
                token
            });
        } else {
            res.sendStatus(401);
        }
    }).catch((err) => {
        sendError(err, res);
    });
};

exports.loginWithToken = function (req, res) {
    const payload = jwt.verify(req.body.token, process.env.JWT_SECRET);
    if (!payload || !payload.email) {
        res.sendStatus(401);
    }

    User.findOne({
            email: payload.email
        })
        .then((user) => {
            if (user == null) {
                throw 'Auth failed';
            }

            req.session.authenticated = true;
            req.session.email = payload.email;
            return new Promise((resolve, reject) => {
                req.session.save((err) => {
                    if (err) {
                        reject(err)
                    } else resolve();
                });
            })
        }).then(() => {
            const token = jwt.sign({
                email: payload.email
            }, process.env.JWT_SECRET);
            res.json({
                email: payload.email,
                token
            });
        })
        .catch((err) => sendError(err, res));
};

exports.logout = function (req, res) {
    if (!req.session.authenticated) return sendError(UNAUTHORIZED, res);

    req.session.destroy(function (err) {
        if (err == null) {
            res.sendStatus(200);
        } else {
            sendError(err, res);
        }
    });
};

exports.updateUser = function (req, res) {
    User.findOne({
            email: req.session.email
        })
        .then((user) => {
            user.password = req.body.password;
            return user.save();
        })
        .then(() => {
            res.json({
                message: 'password updated'
            });
        })
        .catch((err) => sendError(err, res));
};

exports.deleteUser = function (req, res) {
    User.findOne({
            email: req.params.email
        })
        .then((user) => {
            if (user == null) {
                throw NOT_FOUND;
            }
            if (user.email !== req.session.email) {
                throw ACCESS_DENIED;
            }
            user.remove();
            res.json({
                message: 'deleted'
            })
        }).catch((err) => sendError(err, res));
};

exports.getUsers = function (req, res) {
    User.find({}, function (err, users) {
        res.json(users.map((user) => {
            return {
                email: user.email
            };
        }));
    });
};
