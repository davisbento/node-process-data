import byteSize from 'byte-size';
import csvtojson from 'csvtojson';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { Readable, Transform, Writable } from 'node:stream';
import { TransformStream } from 'node:stream/web';

const PORT = 3000;
// curl -N http://localhost:3000
const server = createServer(async (req, res) => {
	const headers = {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET'
	};

	if (req.method === 'OPTIONS') {
		res.writeHead(204, headers);
		res.end();
		return;
	}

	let counter = 0;
	const filename = './data/animeflv.csv';
	const { size } = await stat(filename);

	console.log('processing', byteSize(size).toString());

	try {
		res.writeHead(200, headers);

		const abortController = new AbortController();

		req.once('close', (_) => {
			console.log('connection was closed!', counter);
			abortController.abort();
		});

		await Readable.toWeb(createReadStream(filename))
			.pipeThrough(Transform.toWeb(csvtojson({ headers: ['title', 'description', 'url_anime'] })))
			.pipeThrough(
				new TransformStream({
					async transform(chunk, controller) {
						// chunk is a buffer
						const data = JSON.parse(Buffer.from(chunk));
						const mappedData = JSON.stringify({
							title: data.title,
							description: data.description,
							url: data.url_anime
						});

						counter++;
						await setTimeout(() => {}, 500);

						// just to make sure that our data has as separator
						controller.enqueue(mappedData.concat('\n'));
					}
				})
			)
			.pipeTo(Writable.toWeb(res), { signal: abortController.signal });
	} catch (error) {
		console.error(error);
	}
});

server.listen(PORT).on('listening', () => console.log(`Server is listening on port ${PORT}`));
