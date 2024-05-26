import { Collection, MongoClient,UpdateResult } from "mongodb";
import dotenv from "dotenv";
import {Journeys} from "./interfaces/journeys";
dotenv.config();


export const client = new MongoClient("mongodb+srv://toonpanis:Money420@webontwikkeling.fmbnoc9.mongodb.net/");
export const collection:Collection<Journeys>=client.db("WebontwikkelingTaak2").collection<Journeys>("Milestone3");

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
        console.log("Connected to database");
        process.on("SIGINT", exit);
    } catch (error) {
        console.error(error);
    }
}

