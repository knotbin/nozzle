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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var zod_1 = require("zod");
var src_1 = require("../src");
var mongodb_1 = require("mongodb");
// 1. Define your schema using Zod
var userSchema = (0, src_1.defineModel)(zod_1.z.object({
    name: zod_1.z.string(),
    email: zod_1.z.string().email(),
    age: zod_1.z.number().int().positive().optional(),
    createdAt: zod_1.z.date().default(function () { return new Date(); }),
}));
function runExample() {
    return __awaiter(this, void 0, void 0, function () {
        var UserModel, newUser, insertResult, users, foundUser, updateResult, updatedUser, deleteResult, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, 10, 12]);
                    // 3. Connect to MongoDB
                    return [4 /*yield*/, (0, src_1.connect)('mongodb://localhost:27017', 'mizzleorm_example')];
                case 1:
                    // 3. Connect to MongoDB
                    _a.sent();
                    console.log('Connected to MongoDB');
                    UserModel = new src_1.MongoModel('users', userSchema);
                    // Clean up previous data
                    return [4 /*yield*/, UserModel.delete({})];
                case 2:
                    // Clean up previous data
                    _a.sent();
                    newUser = {
                        name: 'Alice Smith',
                        email: 'alice@example.com',
                        age: 30,
                    };
                    return [4 /*yield*/, UserModel.insertOne(newUser)];
                case 3:
                    insertResult = _a.sent();
                    console.log('Inserted user:', insertResult.insertedId);
                    return [4 /*yield*/, UserModel.find({ name: 'Alice Smith' })];
                case 4:
                    users = _a.sent();
                    console.log('Found users:', users);
                    return [4 /*yield*/, UserModel.findOne({ _id: new mongodb_1.ObjectId(insertResult.insertedId) })];
                case 5:
                    foundUser = _a.sent();
                    console.log('Found one user:', foundUser);
                    return [4 /*yield*/, UserModel.update({ _id: new mongodb_1.ObjectId(insertResult.insertedId) }, { age: 31 })];
                case 6:
                    updateResult = _a.sent();
                    console.log('Updated user count:', updateResult.modifiedCount);
                    return [4 /*yield*/, UserModel.findOne({ _id: new mongodb_1.ObjectId(insertResult.insertedId) })];
                case 7:
                    updatedUser = _a.sent();
                    console.log('Updated user data:', updatedUser);
                    return [4 /*yield*/, UserModel.delete({ name: 'Alice Smith' })];
                case 8:
                    deleteResult = _a.sent();
                    console.log('Deleted user count:', deleteResult.deletedCount);
                    return [3 /*break*/, 12];
                case 9:
                    error_1 = _a.sent();
                    console.error('Error during example run:', error_1);
                    return [3 /*break*/, 12];
                case 10: 
                // 9. Disconnect from MongoDB
                return [4 /*yield*/, (0, src_1.disconnect)()];
                case 11:
                    // 9. Disconnect from MongoDB
                    _a.sent();
                    console.log('Disconnected from MongoDB');
                    return [7 /*endfinally*/];
                case 12: return [2 /*return*/];
            }
        });
    });
}
runExample();
