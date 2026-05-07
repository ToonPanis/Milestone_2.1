import express from "express";
import dotenv from "dotenv";
import session from "./session";
import multer from "multer";
import path from "path";

import { Journeys } from "./interfaces/journeys";
import { User } from "./interfaces/users";

import {
    connect,
    getJourneys,
    getJourneyById,
    updateJourney,
    login,
    createNewUser,
    createJourney,
    deleteJourney,
    deleteAccommodation
} from "./database";

import {
    secureMiddleware,
    secureMiddlewareAdmin
} from "./secureMiddleware";

dotenv.config();

const app = express();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/uploads/");
    },

    filename: function (req, file, cb) {
        cb(
            null,
            Date.now() + path.extname(file.originalname)
        );
    }
});

const upload = multer({
    storage: storage
});

app.set("view engine", "ejs");
app.set("port", 3001);

app.use(session);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

/* ========================================
   HOME PAGE
======================================== */

app.get("/", secureMiddleware, async (req, res) => {
    const journeysList: Journeys[] = await getJourneys();

    const sortField =
        typeof req.query.sortField === "string"
            ? req.query.sortField
            : "land";

    const sortDirection =
        typeof req.query.sortDirection === "string"
            ? req.query.sortDirection
            : "laag-hoog";

    const sortedJourneys = [...journeysList].sort((a, b) => {
        if (sortField === "land") {
            return sortDirection === "laag-hoog"
                ? a.country.localeCompare(b.country)
                : b.country.localeCompare(a.country);
        }

        if (sortField === "stad") {
            return sortDirection === "laag-hoog"
                ? a.city.localeCompare(b.city)
                : b.city.localeCompare(a.city);
        }

        if (sortField === "startdatum") {
            return sortDirection === "laag-hoog"
                ? a.startDate.localeCompare(b.startDate)
                : b.startDate.localeCompare(a.startDate);
        }

        if (sortField === "prijs") {
            return sortDirection === "laag-hoog"
                ? a.price - b.price
                : b.price - a.price;
        }

        if (sortField === "duur") {
            return sortDirection === "laag-hoog"
                ? a.duration - b.duration
                : b.duration - a.duration;
        }

        if (sortField === "status") {
            return sortDirection === "laag-hoog"
                ? a.status.localeCompare(b.status)
                : b.status.localeCompare(a.status);
        }

        return 0;
    });

    const sortFields = [
        {
            value: "land",
            text: "Land",
            selected: sortField === "land" ? "selected" : ""
        },
        {
            value: "stad",
            text: "Stad",
            selected: sortField === "stad" ? "selected" : ""
        },
        {
            value: "startdatum",
            text: "Startdatum",
            selected: sortField === "startdatum" ? "selected" : ""
        },
        {
            value: "duur",
            text: "Duur",
            selected: sortField === "duur" ? "selected" : ""
        },
        {
            value: "prijs",
            text: "Prijs",
            selected: sortField === "prijs" ? "selected" : ""
        },
        {
            value: "status",
            text: "Status",
            selected: sortField === "status" ? "selected" : ""
        }
    ];

    const sortDirections = [
        {
            value: "hoog-laag",
            text: "Hoog-laag",
            selected: sortDirection === "hoog-laag" ? "selected" : ""
        },
        {
            value: "laag-hoog",
            text: "Laag-hoog",
            selected: sortDirection === "laag-hoog" ? "selected" : ""
        }
    ];

    res.render("index", {
        journeys: sortedJourneys,
        sortFields,
        sortDirections,
        q: ""
    });
});

/* ========================================
   SEARCH BY COUNTRY
======================================== */

app.post("/", secureMiddleware, async (req, res) => {
    const journeysList: Journeys[] = await getJourneys();
    const query: string = (req.body.q || "").toLowerCase().trim();

    const filteredJourneys = journeysList.filter(journey =>
        journey.country.toLowerCase().includes(query) ||
        journey.city.toLowerCase().includes(query)
    );

    const sortFields = [
        { value: "land", text: "Land", selected: "selected" },
        { value: "stad", text: "Stad", selected: "" },
        { value: "startdatum", text: "Startdatum", selected: "" },
        { value: "duur", text: "Duur", selected: "" },
        { value: "prijs", text: "Prijs", selected: "" },
        { value: "status", text: "Status", selected: "" }
    ];

    const sortDirections = [
        { value: "hoog-laag", text: "Hoog-laag", selected: "" },
        { value: "laag-hoog", text: "Laag-hoog", selected: "selected" }
    ];

    res.render("index", {
        journeys: filteredJourneys,
        sortFields,
        sortDirections,
        q: query
    });
});

/* ========================================
   SEARCH COUNTRIES PAGE
======================================== */

app.get("/searchCountries", secureMiddleware, async (req, res) => {
    const journeys = await getJourneys();
    const countries = [...new Set(journeys.map(j => j.country))];

    res.render("searchCountries", {
        list: countries,
        q: "",
        data: []
    });
});

app.post("/searchCountries", secureMiddleware, async (req, res) => {
    const journeys = await getJourneys();
    const countries = [...new Set(journeys.map(j => j.country))];
    const query: string = (req.body.q || "").trim();

    const filteredJourneys = journeys.filter(journey =>
        journey.country.toLowerCase().includes(query.toLowerCase()) ||
        journey.city.toLowerCase().includes(query.toLowerCase())
    );

    res.render("searchCountries", {
        list: countries,
        q: query,
        data: filteredJourneys
    });
});

/* ========================================
   ALL JOURNEYS
======================================== */

app.get("/allJourneys", secureMiddleware, async (req, res) => {
    const journeys = await getJourneys();

    res.render("allJourneys", {
        journeys
    });
});

/* ========================================
   ALL ACCOMMODATIONS
======================================== */

app.get("/accommodations", secureMiddleware, async (req, res) => {
    const journeys = await getJourneys();

    res.render("accommodations", {
        journeys
    });
});

/* ========================================
   SINGLE JOURNEY
======================================== */

app.get("/journey/:id", secureMiddleware, async (req, res) => {
    const id = req.params.id;
    const journey = await getJourneyById(id);

    if (journey) {
        const journeys = await getJourneys();

        res.render("journey", {
            list: [...new Set(journeys.map(j => j.country))],
            data: journey
        });
    } else {
        res.render("404");
    }
});

/* ========================================
   JOURNEY ACCOMMODATION
======================================== */

app.get("/journey/:id/accommodation", secureMiddleware, async (req, res) => {
    const id = req.params.id;
    const journey = await getJourneyById(id);

    if (journey) {
        const journeys = await getJourneys();

        res.render("accommodation", {
            list: [...new Set(journeys.map(j => j.country))],
            data: journey
        });
    } else {
        res.render("404");
    }
});

app.get("/plannedOrPaid", secureMiddleware, async (req, res) => {
    const journeys = await getJourneys();

    const statuses = [...new Set(journeys.map(j => j.status))];

    res.render("plannedOrPaid", {
        statuses
    });
});

app.post("/plannedOrPaid", secureMiddleware, async (req, res) => {
    const journeys = await getJourneys();

    const selectedStatus = String(req.body.status)
        .trim()
        .toLowerCase();

    const filteredJourneys = journeys.filter(journey =>
        String(journey.status)
            .trim()
            .toLowerCase() === selectedStatus
    );

    const statuses = [...new Set(journeys.map(j => j.status))];

    res.render("plannedOrPaid", {
        statuses,
        journeys: filteredJourneys
    });
});


/* ========================================
   EDIT JOURNEY
======================================== */

app.get("/journey/:id/edit", secureMiddlewareAdmin, async (req, res) => {
    const id = req.params.id;
    const journey = await getJourneyById(id);

    if (journey) {
        res.render("editJourney", {
            journey
        });
    } else {
        res.render("404");
    }
});

app.post("/journey/:id/edit", secureMiddlewareAdmin, async (req, res) => {
    const id = req.params.id;

    const { duration, price, startDate, status } = req.body;

    const updatedJourney = {
        duration: parseInt(duration),
        price: parseFloat(price),
        startDate,
        status
    };

    const result = await updateJourney(id, updatedJourney);

    if (result.modifiedCount > 0) {
        res.redirect(`/journey/${id}`);
    } else {
        const journey = await getJourneyById(id);

        res.render("editJourney", {
            journey
        });
    }
});

/* ========================================
   ADD JOURNEY
======================================== */

app.get("/addJourney", secureMiddlewareAdmin, async (req, res) => {
    res.render("addJourney", {
        success: req.query.success === "true"
    });
});


app.post(
    "/addJourney",
    secureMiddlewareAdmin,
    upload.fields([
        { name: "img", maxCount: 1 },
        { name: "accommodationImg", maxCount: 1 }
    ]),
    async (req, res) => {
        const journeys = await getJourneys();

        const newId =
            journeys.length > 0
                ? Math.max(...journeys.map(j => Number(j.id))) + 1
                : 1;

        const {
            country,
            city,
            discription,
            duration,
            price,
            startDate,
            status,
            activities,
            paid,
            accommodationName,
            accommodationRank,
            accommodationAdress
        } = req.body;

        const files = req.files as {
            [fieldname: string]: Express.Multer.File[];
        };

        const journeyImg = "/uploads/" + files.img[0].filename;
        const accommodationImg = "/uploads/" + files.accommodationImg[0].filename;

        const newJourney: Journeys = {
            id: String(newId),
            country,
            city,
            discription,
            duration: parseInt(duration),
            paid: paid === "true",
            price: parseFloat(price),
            startDate,
            img: journeyImg,
            status,

            activities: String(activities || "")
            .split(",")
            .map((item: string) => item.trim())
            .filter((item: string) => item !== ""),
            accommodation: {
                id: newId,
                name: accommodationName,
                rank: parseInt(accommodationRank),
                img: accommodationImg,
                adress: accommodationAdress
            }
        };

        await createJourney(newJourney);

        res.redirect("/addJourney?success=true");
    }
);

/* ========================================
   DELETE JOURNEY
======================================== */

app.post(
    "/journey/:id/delete",
    secureMiddlewareAdmin,
    async (req, res) => {
        const id = req.params.id;

        await deleteJourney(id);

        res.redirect("/allJourneys");
    }
);

/* ========================================
   DELETE ACCOMMODATION
======================================== */

app.post(
    "/accommodation/:id/delete",
    secureMiddlewareAdmin,
    async (req, res) => {
        const accommodationId = parseInt(req.params.id);

        await deleteAccommodation(accommodationId);

        res.redirect("/accommodations");
    }
);

/* ========================================
   LOGIN
======================================== */

app.get("/login", (req, res) => {
    const message = {
        type: "Hey,",
        message: "log je hier in aub"
    };

    res.render("login", {
        message
    });
});

app.post("/login", async (req, res) => {
    const email: string = req.body.email;
    const password: string = req.body.password;

    try {
        const user: User = await login(email, password);
        delete user.password;
        req.session.user = user;

        res.redirect("/");
    } catch (error) {
        const message = {
            type: "Hey,",
            message: "er is iets fout gegaan"
        };

        res.render("login", {
            message
        });
    }
});

/* ========================================
   LOGOUT
======================================== */

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

/* ========================================
   REGISTER
======================================== */

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", async (req, res) => {
    const email: string = req.body.email;
    const password: string = req.body.password;

    try {
        await createNewUser(email, password);

        const message = {
            type: "Hey,",
            message: "registratie gelukt, log nu in"
        };

        res.render("login", {
            message
        });
    } catch (error) {
        const message = {
            type: "Hey,",
            message: "gebruiker bestaat reeds"
        };

        res.render("login", {
            message
        });
    }
});

/* ========================================
   START SERVER
======================================== */

app.listen(app.get("port"), async () => {
    await connect();
    console.log("Server started on http://localhost:" + app.get("port"));
});

export {};