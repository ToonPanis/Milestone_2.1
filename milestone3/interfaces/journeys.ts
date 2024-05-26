export interface Journeys
{
    id: string;
    country: string;
    city: string;
    discription: string;
    duration: number;
    paid: boolean;
    price: number;
    startDate:string;
    img: string;
    status: string;
    activities: string[];
    accommodation: Accommodation;
}

export interface Accommodation
{
    id: number;
    name: string;
    rank: number;
    img: string;
    adress: string;
}
