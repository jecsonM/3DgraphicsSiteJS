import * as THREE from 'three';

document.addEventListener('DOMContentLoaded', () => {
    const status = document.getElementById('status');
    const setStatus = (t) => { if (status) status.textContent = t; };

    const root = document.getElementById('WebGL-output');
    if (!root) return;

   
    if (root.dataset.inited === "1") return;
    root.dataset.inited = "1";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xEEEEEE);

    const camera = new THREE.PerspectiveCamera(45, root.clientWidth / root.clientHeight, 0.1, 1000);
    camera.position.set(-30, 35, 30);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(root.clientWidth, root.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    root.append(renderer.domElement);

    scene.add(new THREE.AxesHelper(20));

    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(80, 40),
        new THREE.MeshStandardMaterial({ color: 0xcccccc })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    // Lights 
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.shadow.bias = -0.0005;
    dir.shadow.normalBias = 0.005;
    dir.position.set(-30, 50, -10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 200;
    dir.shadow.camera.left = -60;
    dir.shadow.camera.right = 60;
    dir.shadow.camera.top = 60;
    dir.shadow.camera.bottom = -60;
    scene.add(dir);

    
    const dbMeshes = new Map();

    function meshFromEntity(e) {
        const p = JSON.parse(e.paramsJson ?? "{}");

        let geom;
        if (e.type === 0) {
            geom = new THREE.BoxGeometry(p.width, p.height, p.depth);
        } else if (e.type === 1) {
            geom = new THREE.SphereGeometry(p.radius, p.widthSegments ?? 20, p.heightSegments ?? 20);
        } else if (e.type === 2) {
            geom = new THREE.TorusGeometry(
                p.radius,
                p.tube,
                p.radialSegments ?? 16,
                p.tubularSegments ?? 100
            );
        } else {
            geom = new THREE.BoxGeometry(2, 2, 2);
        }

        const mat = new THREE.MeshStandardMaterial({ color: 0xaa33bb });
        

        const mesh = new THREE.Mesh(geom, mat);

        mesh.position.set(e.x, e.y, e.z);

        if (e.type === 1) { // Sphere
            const r = Number(p.radius ?? 4);
            mesh.position.y = mesh.position.y + r + 0.3;
            
        } else if (e.type === 2) { // Torus
            const R = Number(p.radius ?? 6);   
            const r = Number(p.tube ?? 2);     
            mesh.position.y = mesh.position.y + (R + r) + 0.3;   
        }


        mesh.castShadow = true;
        return mesh;
    }


    async function apiGet() {
        const res = await fetch('/api/shapes', { cache: 'no-store' });
        if (!res.ok) throw new Error(`GET /api/shapes -> ${res.status}`);
        return await res.json();
    }

    async function apiPost(payload) {
        const res = await fetch('/api/shapes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`POST -> ${res.status}: ${text}`);
        return JSON.parse(text);
    }

    async function apiDelete(id) {
        const res = await fetch(`/api/shapes/${id}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 204) throw new Error(`DELETE -> ${res.status}`);
    }

    function renderList(items) {
        const list = document.getElementById('shapeList');
        if (!list) return;

        list.innerHTML = '';
        for (const e of items) {
            const row = document.createElement('div');
            row.className = 'list-group-item d-flex justify-content-between align-items-center';

            const label = document.createElement('div');
            label.textContent = `#${e.id} ${nameOf(e.type)} (${e.x}, ${e.y}, ${e.z})`;

            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-danger';
            btn.textContent = 'Удалить';
            btn.addEventListener('click', async () => {
                try {
                    await apiDelete(e.id);
                    await sync();
                } catch (err) {
                    setStatus(String(err));
                }
            });

            row.append(label, btn);
            list.append(row);
        }
    }

    function nameOf(t) {
        if (t === 0) return 'Box';
        if (t === 1) return 'Sphere';
        if (t === 2) return 'Torus';
        return 'Unknown';
    }


    async function sync() {
        try {
            const items = await apiGet();
            const ids = new Set(items.map(x => x.id));

            for (const e of items) {
                if (!dbMeshes.has(e.id)) {
                    const mesh = meshFromEntity(e);
                    dbMeshes.set(e.id, mesh);
                    scene.add(mesh);
                }
            }

            for (const [id, mesh] of dbMeshes.entries()) {
                if (!ids.has(id)) {
                    scene.remove(mesh);
                    mesh.geometry.dispose();
                    mesh.material.dispose();
                    dbMeshes.delete(id);
                }
            }

            renderList(items);
            setStatus(`Загружено фигур из БД: ${items.length}`);
        } catch (err) {
            setStatus(String(err));
        }
    }

    // UI переключение параметров
    const shapeType = document.getElementById('shapeType');
    function toggleParams() {
        const t = Number(shapeType.value);
        document.getElementById('paramsBox').style.display = (t === 0) ? '' : 'none';
        document.getElementById('paramsSphere').style.display = (t === 1) ? '' : 'none';
        document.getElementById('paramsTorus').style.display = (t === 2) ? '' : 'none';
    }
    shapeType.addEventListener('change', toggleParams);
    toggleParams();

    
    document.getElementById('btnAdd').addEventListener('click', async () => {
        try {
            const t = Number(shapeType.value);

            const x = Number(document.getElementById('posX').value);
            const y = Number(document.getElementById('posY').value);
            const z = Number(document.getElementById('posZ').value);

            let params = {};
            if (t === 0) {
                params = {
                    width: Number(document.getElementById('boxW').value),
                    height: Number(document.getElementById('boxH').value),
                    depth: Number(document.getElementById('boxD').value),
                };
            } else if (t === 1) {
                params = {
                    radius: Number(document.getElementById('sphR').value),
                    widthSegments: Number(document.getElementById('sphWS').value),
                    heightSegments: Number(document.getElementById('sphHS').value),
                };
            } else if (t === 2) {
                params = {
                    radius: Number(document.getElementById('torusR').value),
                    tube: Number(document.getElementById('torusTube').value),
                    radialSegments: Number(document.getElementById('torusRadialSeg').value),
                    tubularSegments: Number(document.getElementById('torusTubularSeg').value),
                };
            }

            await apiPost({ type: t, x, y, z, params });
            await sync();
        } catch (err) {
            setStatus(String(err));
        }
    });

    
    window.addEventListener('resize', () => {
        const w = root.clientWidth;
        const h = root.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    // Render loop
    renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
    });

    // Start
    sync();
});
