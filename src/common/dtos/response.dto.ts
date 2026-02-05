export class ResponseDto {
  status: boolean;
  message: string;
  code: number;
  errors?: Array<string>;
  data?: any;
}
