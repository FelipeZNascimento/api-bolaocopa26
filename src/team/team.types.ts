export interface IConfederation {
  abbreviation: string;
  id: number;
  name: string;
  nameEn: string;
}

export interface IReferee {
  country: string;
  countryEn: string;
  dateOfBirth: string;
  id: number;
  idFifa: number;
  name: string;
}

export interface IStadium {
  capacity: string;
  city: string;
  country: string;
  countryEn: string;
  geoLatitude: string;
  geoLongitude: string;
  id: number;
  name: string;
}

export interface ITeam {
  abbreviation: string;
  abbreviationEn: string;
  colors: string;
  confederation?: IConfederation | null;
  goals: number;
  group: string;
  id: number;
  idConfederation: number;
  idFifa: number;
  isoCode: string;
  name: string;
  nameEn: string;
}
