/**
 * Validates API inputs for the app woohoooooooo~~~~
 */
import {Request, Response, NextFunction} from "express"
/**
 * Validator for /clone route in {@link App}
 */ 
export function validateCloneReq(req: Request, res: Response, next: NextFunction):Response<any> | void {
    const missing_fields = ["owner", "repo", "baseBranch"].filter(field =>{
        !req.body[field]
    });
    if(missing_fields){
        return res.status(400).json({ error: 'Missing required fields', missing_fields });
    } else{
        next()
    }    
}
/**
 * 
 * Validator for branching route in {@link App}
 */
export function validateBranchReq(req: Request, res: Response, next: NextFunction):Response<any> | void {
    var missing_fields:Array<string> = []
    //check params
    console.log(req.body)
    missing_fields = missing_fields.concat(["owner", "repo"].filter(field =>{
        req.params[field]
    }));
    //check body
    missing_fields = missing_fields.concat(['branchName', 'baseBranch'].filter(field =>{
        req.body[field]
    }))
    if(missing_fields.length != 0){
        return res.status(400).json({ error: 'Missing required fields', missing_fields });
    } else{
        next()
    }    
}