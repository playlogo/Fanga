export async function exists(path: string) {
	try {
		await Deno.stat(path);

		return true;
	} catch (err) {
		if (err instanceof Deno.errors.NotFound) {
			return false;
		}

		throw err;
	}
}

// From: https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
export function genId(length: number) {
	let result = "";
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const charactersLength = characters.length;
	let counter = 0;
	while (counter < length) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
		counter += 1;
	}
	return result;
}

export function serialize(input: string) {
	const toReplace: [string, string][] = [
		[" ", "-"],
		[".", "_"],
	];

	for (const replacer in toReplace) {
		input = input.replaceAll(replacer[0], replacer[1]);
	}

	return input;
}

import { encodeHex } from "jsr:@std/encoding/hex";

// From: https://docs.deno.com/examples/hashing/
export async function hash(content: string) {
	const messageBuffer = new TextEncoder().encode(content);
	const hashBuffer = await crypto.subtle.digest("SHA-256", messageBuffer);

	return encodeHex(hashBuffer);
}
