import { Collection, MongoClient,UpdateResult } from "mongodb";
import dotenv from "dotenv";
import {Reis} from "./interfaces/Reis";
dotenv.config();


export const client = new MongoClient("mongodb+srv://toonpanis:Money420@webontwikkeling.fmbnoc9.mongodb.net/");
export const collection:Collection<Reis>=client.db("WebontwikkelingTaak").collection<Reis>("Milestone3");

async function exit() {
    try {
        await client.close();
        console.log("Not connected to database");
    } catch (error) {
        console.error(error);
    }
    process.exit(0);
}

export async function getReizen()
{
    return await collection.find({}).toArray();
}


export async function loadReizenFromApi()
{
    const reizen:Reis[]=await getReizen();
    if (reizen.length==0)
    {
        console.log("Database is empty, loading users from API")
        let response = await fetch("https://raw.githubusercontent.com/ToonPanis/Milestone-ToonPanis/main/milestone1/Reizen.json");
        let reizen:Reis[]= await response.json();
        await collection.insertMany(reizen);
    }
    
}
export async function getReisById(id:string)
{
    return await collection.findOne({id:id});
}
export async function updateReis(id:string,reis:Reis):Promise<UpdateResult<Reis>>
{
    return await collection.updateOne({ id : id }, { $set:  reis });   
}
export async function connect() 
{
    try {
        await client.connect();
        await loadReizenFromApi();   
        console.log("Connected to database");
        process.on("SIGINT", exit);
    } catch (error) {
        console.error(error);
    }
}

