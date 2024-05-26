import express from "express";
import { Journeys } from "./interfaces/journeys";
import { connect, getJourneys, getJourneyById, updateJourney,  login, createNewUser} from "./database";
import { User } from "./interfaces/users";
import session from "./session";
import { secureMiddleware, secureMiddlewareAdmin } from "./secureMiddleware";
import ejs from "ejs";
import dotenv from 'dotenv';
dotenv.config();

const app = express();

app.set("view engine", "ejs");
app.set("port", 3005);

app.use(session);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

let journeysList: Journeys[] = [];
let countries: string[] = [];

app.get("/", secureMiddleware, async (req, res) => {
    journeysList = await getJourneys();
    const sortField = typeof req.query.sortField === "string" ? req.query.sortField : "land";
    const sortDirection = typeof req.query.sortDirection === "string" ? req.query.sortDirection : "laag-hoog";
    
    let sortedJourneys = [...journeysList].sort((a, b) => {
        if (sortField === "land") {
            return sortDirection === "laag-hoog" ? a.country.localeCompare(b.country) : b.country.localeCompare(a.country);
        } else if (sortField === "stad") {
            return sortDirection === "laag-hoog" ? a.city.localeCompare(b.city) : b.city.localeCompare(a.city);
        } else if (sortField === "startDatum") {
            return sortDirection === "laag-hoog" ? a.startDate.localeCompare(b.startDate) : b.startDate.localeCompare(a.startDate);
        } else if (sortField === "prijs") {
            return sortDirection === "laag-hoog" ? a.price - b.price : b.price - a.price;
        } else if (sortField === "duur") {
            return sortDirection === "laag-hoog" ? a.duration - b.duration : b.duration - a.duration;
        } else if (sortField === "status") {
            return sortDirection === "laag-hoog" ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
        } else {
            return 0;
        }
    });

    for (let journey of journeysList) {
        if (!countries.includes(journey.country)) {
            countries.push(journey.country);
        }
    }

    const sortFields = [
        { value: 'land', text: 'land', selected: sortField === 'land' ? 'selected' : '' },
        { value: 'stad', text: 'stad', selected: sortField === 'stad' ? 'selected' : '' },
        { value: 'startdatum', text: 'Startdatum', selected: sortField === 'startdatum' ? 'selected' : '' },
        { value: 'duur', text: 'Duur', selected: sortField === 'duur' ? 'selected' : '' },
        { value: 'prijs', text: 'Prijs', selected: sortField === 'prijs' ? 'selected' : '' },
        { value: 'status', text: 'Status', selected: sortField === 'status' ? 'selected' : '' }
    ];
    
    const sortDirections = [
        { value: 'hoog-laag', text: 'Hoog-laag', selected: sortDirection === 'hoog-laag' ? 'selected' : '' },
        { value: 'laag-hoog', text: 'Laag-hoog', selected: sortDirection === 'laag-hoog' ? 'selected' : '' }
    ];

    res.render("index", {
        journeys: sortedJourneys,
        sortField: sortField,
        sortDirection: sortDirection,
        sortFields: sortFields,
        sortDirections: sortDirections,
        list: countries,
        bestemming: "",
        q: "",
        data: [],
    });
});

app.post("/", async (req, res) => {
    let nameCountry: string = req.body.q.toLowerCase();
    let journeysByCountry = journeysList.filter(journey => journey.country.toLowerCase().includes(nameCountry));

    const sortFields = [
        { value: 'land', text: 'land', selected: 'selected' },
        { value: 'stad', text: 'stad', selected: '' },
        { value: 'startdatum', text: 'Startdatum', selected: '' },
        { value: 'duur', text: 'Duur', selected: '' },
        { value: 'prijs', text: 'Prijs', selected: '' },
        { value: 'status', text: 'Status', selected: '' }
    ];

    const sortDirections = [
        { value: 'hoog-laag', text: 'Hoog-laag', selected: '' },
        { value: 'laag-hoog', text: 'Laag-hoog', selected: 'selected' }
    ];

    res.render("index", {
        sortFields: sortFields,
        sortDirections: sortDirections,
        sortField: null,
        sortDirection: null,
        journeys: journeysByCountry,
        country: nameCountry,
        list: countries,
        data: journeysByCountry,
        q: nameCountry
    });
});

app.get("/searchCountries", (req, res) => {
    res.render("searchCountries", {
        list: countries,
        q: "",
        data: [],
    });
});

app.post("/searchCountries", (req, res) => {
    let nameCountry: string = req.body.q;
    let filteredJourneys: Journeys[] = [];
    for (let journey of journeysList) {
        if (journey.country.toLowerCase().includes(nameCountry.toLowerCase())) {
            filteredJourneys.push(journey);
        }
    }
    res.render("searchCountries", {
        list: countries,
        data: filteredJourneys,
        q: nameCountry
    });
});

app.get("/allJourneys", async (req, res) => {
    const journeys = await getJourneys();  // Zorg ervoor dat getJourneys() alle reizen ophaalt
    res.render("allJourneys", { journeys });
})

app.get("/accommodations", async (req, res) => {
    const journeys = await getJourneys(); // Zorg ervoor dat deze functie bestaat en werkt
    res.render("accommodations", {
        journeys
    });
});

app.get("/journey/:id", async (req, res) => {
    const search: string = req.params.id;
    const journey = await getJourneyById(search);
    if (journey) {
        res.render("journey", {
            list: countries,
            data: journey
        });
    } else {
        res.render("404");
    }
});

app.get("/journey/:id/accommodation", (req, res) => {
    let search: number = parseInt(req.params.id);
    let found: boolean = false;
    for (let journey of journeysList) {
        if (journey.accommodation.id === search) {
            found = true;
            res.render("accommodation", {
                list: countries,
                data: journey
            });
            break;
        }
    }
    if (!found) {
        res.render("404");
    }
});

app.get("/journey/:id/edit", async (req, res) => {
    const id = req.params.id;
    const journey = await getJourneyById(id);

    if (journey) {
        res.render("editJourney", { journey });
    } else {
        res.render("404");
    }
});

app.post("/journey/:id/edit", async (req, res) => {
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
        res.render("editJourney", { journey });
    }
});

// Login and Logout
app.get("/login", (req, res) => {
    let message1 = { type: "Hey, ", message: "log je hier in aub" };
    res.render("login", {
        message: message1,
    });
});

app.post("/login", async (req, res) => {
    const email: string = req.body.email;
    const password: string = req.body.password;
    try {
        let user: User = await login(email, password);
        delete user.password;
        req.session.user = user;
        res.redirect("/");
    } catch (e: any) {
        let message1 = { type: "Hey,", message: " er is iets fout gegaan." };
        res.render("login", {
            message: message1,
        });
    }
});

app.get("/logout", async (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

// Register
app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", async (req, res) => {
    const email: string = req.body.email;
    const password: string = req.body.password;
    try {
        await createNewUser(email, password);
        let message1 = { type: "Hey,", message: " registratie is gelukt. Log je nu in" };
        res.render("login", {
            message: message1,
        });
    } catch (e) {
        let message1 = { type: "Hey,", message: "gebruiker bestaat reeds" };
        res.render("login", {
            message: message1,
        });
    }
});

app.listen(app.get("port"), async () => {
    await connect();
    countries = [...new Set(journeysList.map(journey => journey.country))];
    console.log("Server started on http://localhost:" + app.get('port'));
});

export {}
