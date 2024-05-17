export interface Reis
{
    id: string;
    bestemming: string;
    omschrijving: string;
    duur: number;
    betaald: boolean;
    prijs: number;
    startDatum: string;
    afbeelding: string;
    status: string;
    activiteiten: string[];
    accommodatie: Accommodatie;
}

export interface Accommodatie 
{
    id: number;
    naam: string;
    beoordeling: number;
    afbeelding: string;
    adres: string;
}
