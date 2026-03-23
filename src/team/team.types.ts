export interface IClub {
  country: ICountry;
  id: number;
  name: string;
}

export interface IClubRaw {
  countryAbbreviation: string;
  countryAbbreviationEn: string;
  countryId: number;
  countryIsoCode: string;
  countryName: string;
  countryNameEn: string;
  id: number;
  idCountry: number;
  name: string;
}

export interface IConfederation {
  abbreviation: string;
  id: number;
  name: string;
  nameEn: string;
}

export interface IPlayer {
  club: IClub | null;
  dateOfBirth: string;
  fifa: {
    id: number;
    pictureId: number;
  };
  height: number;
  id: number;
  name: string;
  position: {
    abbreviation: string;
    description: string;
    id: number;
  };
  team: ITeam | null;
}

export interface IPlayerRaw {
  dateOfBirth: string;
  height: number;
  id: number;
  idClub: number;
  idFifa: number;
  idFifaPicture: number;
  idPosition: number;
  idTeam: number;
  name: string;
  number: number;
  positionAbbreviation: string;
  positionAbbreviationEn: string;
  positionDescription: string;
  positionDescriptionEn: string;
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
  colors: string[];
  colorsRaw: string;
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

interface ICountry {
  abbreviation: string;
  abbreviationEn: string;
  id: number;
  isoCode: string;
  name: string;
  nameEn: string;
}
