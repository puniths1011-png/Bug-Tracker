"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filter = {};
        // By default, hide invites that haven't been accepted yet (e.g. for an
        // "assign to developer" dropdown). Pass ?includePending=true for the
        // admin's user management page, which should show invite status too.
        if (req.query.includePending !== 'true') {
            filter.status = { $ne: 'pending' };
        }
        if (req.query.role) {
            filter.role = req.query.role;
        }
        const users = yield User_1.default.find(filter).select('-password').sort({ createdAt: -1 });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.getUsers = getUsers;
