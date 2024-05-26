import express, { Express } from "express";
import {Reis} from "./interfaces/Reis";
import { ObjectId } from "mongodb";
import { connect,getReizen,loadReizenFromApi, getReisById, updateReis, collection} from "./database";
import dotenv from "dotenv";
import readline from "readline-sync";
import ejs from "ejs";


const app : Express = express();

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("port", 3000);

let reizen:Reis[] = [];
let bestemmingen:string[] = [];

app.get("/",async (req, res) => {
    reizen = await getReizen();
    const sortField = typeof req.query.sortField === "string" ? req.query.sortField : "bestemming";
    const sortDirection = typeof req.query.sortDirection === "string" ? req.query.sortDirection : "laag-hoog";
    
    let sortedReizen = [...reizen].sort((a, b) =>  {
            if (sortField === "bestemming") {
                return sortDirection === "laag-hoog" ? a.bestemming.localeCompare(b.bestemming) : b.bestemming.localeCompare(a.bestemming);
            } else if (sortField === "startDatum") {
                return sortDirection === "laag-hoog" ? a.startDatum.localeCompare(b.startDatum) : b.startDatum.localeCompare(a.startDatum);
            } else if (sortField === "duur") {
                return sortDirection === "laag-hoog" ? a.duur - b.duur : b.duur - a.duur;
            } else if (sortField === "prijs") {
                return sortDirection === "laag-hoog" ? a.prijs - b.prijs : b.prijs - a.prijs;
            } else if (sortField === "status") {
                return sortDirection === "laag-hoog" ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
            } else {
                return 0;
            }
    });

    for(let reis of reizen){
        if(bestemmingen.includes(reis.bestemming) == false)
            {
                bestemmingen.push(reis.bestemming)
            }
    }

    const sortFields = [
        { value: 'bestemming', text: 'Bestemming', selected: sortField === 'bestemming' ? 'selected' : ''},
        { value: 'startdatum', text: 'Startdatum', selected: sortField === 'startdatum' ?  'selected' : ''},
        { value: 'duur', text: 'Duur', selected: sortField === 'duur' ? 'selected' : ''},
        { value: 'prijs', text: 'Prijs', selected: sortField === 'prijs' ? 'selected' : ''},
        { value: 'status', text: 'Status', selected: sortField === 'status' ? 'selected' : ''}
    ];
    
    const sortDirections = [
        { value: 'hoog-laag', text: 'Hoog-laag', selected: sortDirection === 'hoog-laag' ? 'selected' : ''},
        { value: 'laag-hoog', text: 'Laag-hoog', selected: sortDirection === 'laag-hoog' ? 'selected' : ''}
    ];

    res.render("index", {
        reizen: sortedReizen,
        sortField: sortField,
        sortDirection: sortDirection,
        sortFields: sortFields,
        sortDirections: sortDirections,
        bestemming:"",
        q:""
    });
});

app.post("/",(req,res)=>{
    let naamBestemming:string=req.body.q;
    let byBestemming=[...reizen].filter(reis=>reis.bestemming.toLowerCase().includes(naamBestemming.toLowerCase()));
    res.render("index",
    {
        reizen:byBestemming,
        sortFields: null,
        sortDirections: null,
        sortField: null,
        sortDirection: null,
        bestemming:naamBestemming,
        q:naamBestemming
    });

});

app.get("/bestemmingen",(req,res)=>
    {
        res.render("bestemmingen",
            {
                list:bestemmingen,
                q:"",
                data:[],
            }
        )
    });

app.post("/bestemmingen",(req,res)=>{
    let naamBestemming:string=req.body.q;
    let filteredReizen:Reis[]=[];
    for(let reis of reizen){
        if(reis.bestemming.includes(naamBestemming))
            {
                filteredReizen.push(reis)
            }
    }
    res.render("bestemmingen",
        {
            list:bestemmingen,
            data:filteredReizen,
            q:naamBestemming
        })
});

app.get("/bestemming/:id", (req, res) => {
    let search = parseInt(req.params.id);
    let found = false;
    for (let reis of reizen) {
        if (reis.accommodatie.id === search) {
            found = true;
            res.render("bestemming", {
                list: bestemmingen,
                data: reis
            });
            break;
        }
    }
    if (!found) {
        res.render("404");
    }
});


app.get("/bestemming/:id/accommodatie",(req,res)=>{
    let search:number = parseInt(req.params.id);
    let found:boolean=false;
    for (let i:number=0;i<reizen.length;i++)
        {
            if (reizen[i].accommodatie.id==search)
                {
                    found=true;
                    res.render("accommodatieInfo",
                    {
                        list:bestemmingen,
                        data:reizen[i]
                        
                    })
                    break;
                }
        }
    if (found == false)
    {
        res.render("404");
    }
});

app.get("/bestemming",(req,res)=> {
    res.render("bestemming", {
        list: bestemmingen,
        data: reizen[0]
    });
});

app.use("/bestemming",(req,res)=>{
    let zoekBestemming:string=req.body.q;
    let bestemmingId:Reis=reizen[0];
    
    for (let reis of reizen) {
        if (zoekBestemming === reis.bestemming) {
            bestemmingId= reis;
        }
    }
    
    res.render("bestemming",
        {
            list:reizen,
            data:bestemmingId,
            q:null
        })

});


 app.get("/reizen",(req,res)=>
{
    let data:Reis[]=[];
    res.render("reizen",
        {
            data:data,
            q:""
        }
    )
});

app.post("/reizen",(req,res)=>
{
    let zoekStatus=req.body.q;
    let naamStatus:Reis[]=[];
    for (let reis of reizen) {
        if (reis.status.toLowerCase().includes(zoekStatus.toLowerCase()) || reis.omschrijving.toLowerCase().includes(zoekStatus.toLowerCase())) {
            naamStatus.push(reis);
        }
    }
    
        res.render("reizen",
        {
            data: naamStatus,
            q:zoekStatus
        }
    )
});

app.get("/bestemming/:id/edit", async (req, res) => {
    let id:string = req.params.id;
        let reis:Reis|null = await getReisById(id);
        if (!reis) {
            res.redirect("/");
        }
        res.render("editBestemming",
        {
            reis:reis,
        }
    );
});

app.post("/bestemming/:id/edit", async (req, res) => {
    let id:string = req.params.id;
    let reis:Reis|null = req.body;
    if(!reis)
        {
            res.redirect("/");
            return;
        }
        await updateReis(id,reis);
        res.redirect("/");
   
});




app.listen(app.get("port"), async() => {
    await connect();
    console.log("Server started on http://localhost:" + app.get('port'));
});