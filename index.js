//Const party!!
const express = require('express');
const hbs = require('express-handlebars');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const session = require('express-session');
const bcrypt = require('bcrypt');
const MongoStore = require('connect-mongo').default;
const User = require("./models/user");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

require("./passport/passport");
require('dotenv').config();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("Missing Connection Data");
    process.exit(1);
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//Connect to Mongo
async function connectToMongo() {
    try {
        await mongoose.connect(MONGO_URI, { dbName: "Empl" });
        console.log("Connected to MongoDB!!");
    }
    catch (err) {
        console.error("Error connecting to MongoDB:", err.message);
        process.exit(1);
    }
};

app.use(
    session(
        {
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create(
                {
                    mongoUrl: process.env.MONGO_URI,
                    dbName: "Empl"
                }
            ),
            cookie: { httpOnly: true },
        }
    )
);

app.use(passport.initialize());
app.use(passport.session());

function authenticate(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.redirect("/login");
}

const employeeSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    department: { type: String, required: true },
    startDate: { type: Date, required: true },
    jobTitle: { type: String, required: true, trim: true },
    salary: { type: Number, required: true, min: 0 }
});

const dateInput = (date) => {
    if (!date) return "";
    const dt = new Date(date);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
};

const Employee = mongoose.model("Employee", employeeSchema, "employees");

const departments = ["HR", "Marketing", "Engineering", "Sales", "Finance"];
const DepartmentsList = (selected) =>
    departments.map((dept) => ({ name: dept, selected: dept === selected }));

app.engine("hbs", hbs.engine({ extname: ".hbs" }));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

//Routes n stuff --------------------------------------------------
//Employee Routes
app.get("/", (req, res) => {
    if (req.isAuthenticated()) return res.redirect("/employees");
    return res.redirect("/login");
});

app.post("/employees", authenticate, async (req, res) => {
    try {
        const { firstName, lastName, department, startDate, jobTitle, salary } = req.body;

        await Employee.create({
            firstName,
            lastName,
            department,
            startDate,
            jobTitle,
            salary: Number(salary)
        });

        res.redirect("/employees");
    } catch (err) {
        console.error("Error creating employee:", err.message);
        res.status(400).render("index", {
            title: "Create Employee",
            departments: DepartmentsList(req.body.department),
            error: "Error creating employee",
            form: req.body
        });
    }
});
app.get("/employees", authenticate, async (req, res) => {
    const employees = await Employee.find().lean();
    res.render("employees", { title: "Employee List", employees });
});

app.get("/create", authenticate, (req, res) => {
    res.render("index", { title: "Create Employee", departments: DepartmentsList() });
});

app.get("/employees/:id/edit", authenticate, async (req, res) => {
    const employee = await Employee.findById(req.params.id).lean();
    if (!employee) {
        return res.status(404).send("Employee not found");
    }
    res.render("edit", {
        title: "Update Employee",
        employee: { ...employee, startDateValue: dateInput(employee.startDate) },
        departments: DepartmentsList(employee.department)
    });
});

app.post("/employees/:id/update", authenticate, async (req, res) => {
    try {
        const { firstName, lastName, department, startDate, jobTitle, salary } = req.body;

        await Employee.findByIdAndUpdate(req.params.id, {
            firstName,
            lastName,
            department,
            startDate,
            jobTitle,
            salary: Number(salary)
        });

        res.redirect("/employees");
    } catch (err) {
        console.error("Error updating employee:", err.message);
        res.status(400).render("edit", {
            title: "Update Employee",
            employee: { ...req.body, _id: req.params.id },
            departments: DepartmentsList(req.body.department),
            error: "Error updating employee"
        });
    }
});

app.get("/employees/:id/delete", authenticate, async (req, res) => {
    try {
        const deleted = await Employee.findByIdAndDelete(req.params.id).lean();
        const message = deleted
            ? `Deleted ${deleted.firstName} ${deleted.lastName} from the database.`
            : "Employee not found.";

        res.render("delete", { title: "Delete", message });
    } catch (err) {
        console.error("Error deleting employee:", err.message);
        res.status(400).render("delete", { title: "Delete", message: "Error deleting employee." });
    }
});

//Authentication Routes ---------------------------------------------
app.get("/register", (req, res) => {
    res.render("auth/register", { title: "Register" });
});

app.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body
        if (!username || !email || !password) {
            return res.status(400).render("auth/register", { title: "Register", error: "All fields are required" })
        }
        if (String(password).length < 6) {
            return res.status(400).render("auth/register", { title: "Register", error: "Password must be at least 6 characters" })
        }
        const existing = await User.findOne({ $or: [{ username }, { email }] }).lean()
        if (existing) {
            return res.status(400).render("auth/register", { title: "Register", error: "Username or email already exists" })
        }
        const passwordhash = await bcrypt.hash(password, 10)
        await User.create({ username, email, password: passwordhash })
        res.redirect("/login")
    } catch (err) {
        console.error("Error registering user:", err.message)
        res.status(400).render("auth/register", { title: "Register", error: "Error registering user" })
    }
})

app.get("/login", (req, res) => {
    res.render("auth/login", { title: "Login" });
});

app.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) {
            console.error("Error logging in:", err.message)
            return res.status(400).render("auth/login", { title: "Login", error: "Error logging in" })
        }
        if (!user) {
            return res.status(400).render("auth/login", { title: "Login", error: info?.message || "Invalid credentials" })
        }
        req.logIn(user, (err2) => {
            if (err2) {
                console.error("Error logging in:", err2.message)
                return res.status(400).render("auth/login", { title: "Login", error: "Error logging in" })
            }
            return res.redirect("/employees")
        })
    })(req, res, next)
})

app.get("/dashboard", authenticate, (req, res) => {
    res.render("auth/dashboard", { title: "Dashboard", message: "Welcome to your dashboard!" });
});

app.get("/logout", (req, res) => {
    req.logout(function (err) {
        if (err) {
            return res.redirect("/login");
        }
        req.session.destroy(() => {
            res.clearCookie("connect.sid");
            res.redirect("/login");
        });
    });
});

connectToMongo().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});

