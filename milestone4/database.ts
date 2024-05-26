import { Collection, MongoClient,UpdateResult } from "mongodb";
import dotenv from "dotenv";
import {Journeys} from "./interfaces/journeys";
import { User } from "./interfaces/users";
import bcrypt from "bcrypt";
import { error } from "console";

dotenv.config();


export const MONGO_URI = process.env.MONGO_URI ?? "mongodb://localhost:27017"
export const client = new MongoClient(MONGO_URI);
export const collection:Collection<Journeys>=client.db("WebontwikkelingTaak2").collection<Journeys>("Milestone3");
export const users:Collection<User>=client.db("login-express").collection<User>("users");

const saltRounds : number = 10;

async function createInitialUser() {
    await users.deleteOne({
        email: "ADMIN@AP.BE"
    })
    await users.deleteOne({
        email: "USER@AP.BE"
    });

    let user:User[]=[];
    user[0]=
    {
        email:"ADMIN@AP.BE",
        password:"admin",
        role:"ADMIN"
    }
    user[1]=
    {
        email:"USER@AP.BE",
        password:"user",
        role:"USER"
    }
    
    
    await users.insertMany([{
        email: user[0].email,
        password: await bcrypt.hash(user[0].password!, saltRounds),
        role: user[0].role
    },{
        email: user[1].email,
        password: await bcrypt.hash(user[1].password!, saltRounds),
        role: user[1].role
    }
    ]);
}

export async function createNewUser(emailUser:string,passwordUser:string){
    let user:User= {
        email:emailUser,
        password: passwordUser,
        role: "USER"
    }
    const double = await users.findOne({email:emailUser});
    if (double){
        throw new Error("user bestaat reeds")
    }
    else{
        users.insertOne({
            email: user.email,
            password: await bcrypt.hash(user.password!, saltRounds),
            role: user.role
        })
    }
}

export async function login(email: string, password: string) {
    if (email === "" || password === "") {
        throw new Error("Email and password required");
    }
    let user : User | null = await users.findOne<User>({email: email});
    if (user) {
        if (await bcrypt.compare(password, user.password!)) {
            return user;
        } else {
            throw new Error("Password incorrect");
        }
    } else {
        throw new Error("User not found");
    }
}

async function exit() {
    try {
        await client.close();
        console.log("Not connected to database");
    } catch (error) {
        console.error(error);
    }
    process.exit(0);
}

export async function getJourneys()
{
    return await collection.find({}).toArray();
}


export async function loadJourneysFromApi()
{
    const reizen:Journeys[]=await getJourneys();
    if (reizen.length==0)
    {
        console.log("Database is empty, loading users from API")
        let response = await fetch("https://raw.githubusercontent.com/ToonPanis/Milestone-ToonPanis/main/milestone1/journeys.json");
        let reizen:Journeys[]= await response.json();
        await collection.insertMany(reizen);
    }
    
}
export async function getJourneyById(id:string)
{
    return await collection.findOne({id:id});
}
export async function updateJourney(id: string, updatedFields: Partial<Journeys>): Promise<UpdateResult> {
    return await collection.updateOne({ id: id }, { $set: updatedFields });
}


export async function connect() 
{
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

