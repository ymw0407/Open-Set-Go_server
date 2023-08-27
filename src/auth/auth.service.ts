import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload } from './tokenPayload.interface';
import { Octokit } from '@octokit/rest';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  getGithubAccessToken = async (
    authCode: string,
  ): Promise<{
    returnValue: boolean;
    githubAccessToken: string;
    errMsg: any;
  }> => {
    try {
      const res = await axios({
        method: 'post',
        url: 'https://github.com/login/oauth/access_token',
        headers: {
          accept: 'application/json',
        },
        data: {
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          code: authCode,
        },
      });

      if (res.data.error === undefined) {
        return {
          returnValue: true,
          githubAccessToken: res.data.access_token,
          errMsg: null,
        };
      } else {
        return {
          returnValue: false,
          githubAccessToken: null,
          errMsg: res.data,
        };
      }
    } catch (error) {
      Logger.verbose(
        `Failed to get access token from github. Error : ${error.message}`,
      );
      return {
        returnValue: false,
        githubAccessToken: null,
        errMsg: error.message,
      };
    }
  };

  getGithubUser = async (
    githubAccessToken: string,
  ): Promise<{
    returnValue: boolean;
    errMsg: any;
    user: {
      id: string;
      name: string;
      avatar: string;
      orgs: any[];
    };
  }> => {
    try {
      const octokit = new Octokit({ auth: githubAccessToken });
      const userInfo = await octokit.rest.users.getAuthenticated();
      if (userInfo.status != 200) {
        return {
          returnValue: false,
          user: null,
          errMsg: `error occured at octokit.rest.users.getAuthenticated()`,
        };
      }

      const orgInfos = await octokit.orgs.listForAuthenticatedUser();
      if (orgInfos.status != 200) {
        return {
          returnValue: false,
          user: null,
          errMsg: `error occured at octokit.rest.orgs.listForAuthenticatedUser()`,
        };
      }
      const orgs = [];
      orgInfos.data.forEach((orgInfo) => {
        orgs.push({
          id: orgInfo.login,
          avatar: orgInfo.avatar_url,
        });
      });

      return {
        returnValue: true,
        user: {
          id: userInfo.data.login,
          name: userInfo.data.name,
          avatar: userInfo.data.avatar_url,
          orgs: orgs,
        },
        errMsg: null,
      };
    } catch (error) {
      Logger.verbose(
        `Failed to get access token from github. Error : ${error.message}`,
      );
      return {
        returnValue: false,
        user: null,
        errMsg: error.message,
      };
    }
  };

  getCookieWithJwtToken(userId: string) {
    const payload: TokenPayload = { userId };
    const token = this.jwtService.sign(payload);
    return `Authentication=${token}; HttpOnly; Path=/; Max-Age=${process.env.JWT_EXPIRATION_TIME}`;
  }
}
