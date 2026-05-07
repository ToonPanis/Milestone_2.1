import { Collection, MongoClient, UpdateResult } from "mongodb";
import dotenv from "dotenv";
import { Journeys } from "./interfaces/journeys";
import { User } from "./interfaces/users";
import bcrypt from "bcrypt";

dotenv.config();

export const MONGO_URI = process.env.MONGO_URI ?? "mongodb://localhost:27017";
export const client = new MongoClient(MONGO_URI);

export const collection: Collection<Journeys> = client
    .db("WebontwikkelingTaak2")
    .collection<Journeys>("Milestone3");

export const users: Collection<User> = client
    .db("login-express")
    .collection<User>("users");

const saltRounds: number = 10;

async function createInitialUser(): Promise<void> {
    await users.deleteOne({ email: "ADMIN@AP.BE" });
    await users.deleteOne({ email: "USER@AP.BE" });

    const defaultUsers: User[] = [
        {
            email: "ADMIN@AP.BE",
            password: "admin",
            role: "ADMIN"
        },
        {
            email: "USER@AP.BE",
            password: "user",
            role: "USER"
        }
    ];

    await users.insertMany([
        {
            email: defaultUsers[0].email,
            password: await bcrypt.hash(defaultUsers[0].password!, saltRounds),
            role: defaultUsers[0].role
        },
        {
            email: defaultUsers[1].email,
            password: await bcrypt.hash(defaultUsers[1].password!, saltRounds),
            role: defaultUsers[1].role
        }
    ]);
}

export async function createNewUser(emailUser: string, passwordUser: string): Promise<void> {
    const existingUser = await users.findOne({ email: emailUser });

    if (existingUser) {
        throw new Error("Gebruiker bestaat reeds");
    }

    const newUser: User = {
        email: emailUser,
        password: passwordUser,
        role: "USER"
    };

    await users.insertOne({
        email: newUser.email,
        password: await bcrypt.hash(newUser.password!, saltRounds),
        role: newUser.role
    });
}

export async function login(email: string, password: string): Promise<User> {
    if (email === "" || password === "") {
        throw new Error("Email and password required");
    }

    const user: User | null = await users.findOne({ email: email });

    if (!user) {
        throw new Error("User not found");
    }

    const passwordCorrect = await bcrypt.compare(password, user.password!);

    if (!passwordCorrect) {
        throw new Error("Password incorrect");
    }

    return user;
}

async function exit(): Promise<void> {
    try {
        await client.close();
        console.log("Disconnected from database");
    } catch (error) {
        console.error(error);
    }
    process.exit(0);
}

export async function getJourneys(): Promise<Journeys[]> {
    return await collection.find({}).toArray();
}

export async function loadJourneysFromApi(): Promise<void> {
    const reizen: Journeys[] = await getJourneys();

    if (reizen.length === 0) {
        console.log("Database is empty, loading journeys from API");

        const response = await fetch(
            "https://raw.githubusercontent.com/ToonPanis/Milestone-ToonPanis/main/milestone1/journeys.json"
        );

        const journeysFromApi: Journeys[] = await response.json();
        await collection.insertMany(journeysFromApi);
    }
}

export async function getJourneyById(id: string): Promise<Journeys | null> {
    return await collection.findOne({ id: id });
}

export async function updateJourney(
    id: string,
    updatedFields: Partial<Journeys>
): Promise<UpdateResult> {
    return await collection.updateOne(
        { id: id },
        { $set: updatedFields }
    );
}

export async function createJourney(newJourney: Journeys) {
    return await collection.insertOne(newJourney);
}
export async function deleteJourney(id: string) {
    return await collection.deleteOne({ id: id });
}

export async function deleteAccommodation(accommodationId: number) {
    return await collection.deleteOne({
        "accommodation.id": accommodationId
    });
}



export async function connect(): Promise<void> {
    try {
        await client.connect();
        await loadJourneysFromApi();
        await createInitialUser();
        console.log("Connected to database");
        process.on("SIGINT", exit);
    } catch (error) {
        console.error(error);
    }
}