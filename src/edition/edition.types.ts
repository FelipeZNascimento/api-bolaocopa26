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
  isoCode: string;
  name: string;
}

export type TEditionInfo = { currentEdition: null | number; currentRound: null | number; editionStart: null | number };
