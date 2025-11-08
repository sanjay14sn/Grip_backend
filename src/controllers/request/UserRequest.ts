import z from 'zod';
const userObj = z.object({
    firstName: z.string().nonempty(),
});
export default userObj;