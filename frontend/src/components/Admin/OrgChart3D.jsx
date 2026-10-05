import React, { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import { FiX, FiUser, FiUsers, FiLayers, FiBriefcase } from 'react-icons/fi';

// Organigramme en 3D : chaque personne est une sphère reliée à son responsable.
// Les personnes sans responsable dans leur département sont reliées au pôle du département,
// et chaque département est relié au centre « SOTACIB ».

const PALETTE = ['#e8591a', '#2f9e6b', '#3b82c4', '#8a6bd1', '#e0a019', '#d64545', '#14b8a6', '#ec4899'];

const normalizeText = (value) => (value || '').toString().toLowerCase().trim();

const OrgChart3D = ({ users }) => {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [selected, setSelected] = useState(null);

  // Taille du canvas = taille du conteneur
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { graphData, departments } = useMemo(() => {
    const deptKeys = [...new Set(users.map((u) => u.departmentKey || normalizeText(u.department) || 'sans_departement'))];
    const deptInfo = deptKeys.map((key, index) => ({
      key,
      label: users.find((u) => (u.departmentKey || normalizeText(u.department) || 'sans_departement') === key)?.department || 'Sans département',
      color: PALETTE[index % PALETTE.length],
    }));
    const colorOf = Object.fromEntries(deptInfo.map((d) => [d.key, d.color]));
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));

    const nodes = [
      { id: 'root', kind: 'root', name: 'SOTACIB', color: '#fbfaf7', val: 14 },
      ...deptInfo.map((d) => ({ id: `dept-${d.key}`, kind: 'dept', name: d.label, color: d.color, val: 8 })),
      ...users.map((u) => {
        const key = u.departmentKey || normalizeText(u.department) || 'sans_departement';
        return {
          id: `user-${u.id}`,
          kind: 'user',
          user: u,
          name: u.fullName,
          color: colorOf[key],
          val: 2 + Number(u.hierarchyLevel || 1) * 1.5,
        };
      }),
    ];

    const links = deptInfo.map((d) => ({ source: 'root', target: `dept-${d.key}`, color: d.color, strong: true }));
    users.forEach((u) => {
      const key = u.departmentKey || normalizeText(u.department) || 'sans_departement';
      const manager = u.effectiveManagerId ? byId[u.effectiveManagerId] : null;
      const managerKey = manager ? (manager.departmentKey || normalizeText(manager.department) || 'sans_departement') : null;
      if (manager && managerKey === key) {
        links.push({ source: `user-${manager.id}`, target: `user-${u.id}`, color: colorOf[key] });
      } else {
        links.push({ source: `dept-${key}`, target: `user-${u.id}`, color: colorOf[key] });
      }
    });

    return { graphData: { nodes, links }, departments: deptInfo };
  }, [users]);

  // Rotation lente et automatique de la caméra, arrêtée dès que l'utilisateur manipule la vue
  const [autoRotate, setAutoRotate] = useState(true);
  useEffect(() => {
    const controls = graphRef.current?.controls?.();
    if (!controls) return undefined;
    const stop = () => setAutoRotate(false);
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, []);

  useEffect(() => {
    if (selected || !autoRotate) return undefined;
    let angle = 0;
    const distance = 210;
    const timer = setInterval(() => {
      const graph = graphRef.current;
      if (!graph) return;
      angle += Math.PI / 900;
      graph.cameraPosition({ x: distance * Math.sin(angle), z: distance * Math.cos(angle) });
    }, 30);
    return () => clearInterval(timer);
  }, [selected, autoRotate]);

  const buildNodeObject = (node) => {
    const group = new THREE.Group();
    const radius = node.kind === 'root' ? 9 : node.kind === 'dept' ? 6 : 2.5 + Number(node.user?.hierarchyLevel || 1) * 1.2;
    const material = new THREE.MeshStandardMaterial({
      color: node.color,
      emissive: node.color,
      emissiveIntensity: node.kind === 'user' ? 0.25 : 0.5,
      roughness: 0.35,
      metalness: 0.1,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), material);
    group.add(sphere);

    if (node.kind !== 'user') {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius + 2.2, 0.35, 12, 48),
        new THREE.MeshBasicMaterial({ color: node.color, transparent: true, opacity: 0.6 })
      );
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    const label = new SpriteText(node.name);
    label.color = node.kind === 'user' ? '#d8d3c9' : '#ffffff';
    label.textHeight = node.kind === 'root' ? 8 : node.kind === 'dept' ? 6 : 4;
    label.fontFace = 'Inter, sans-serif';
    label.fontWeight = node.kind === 'user' ? '400' : '600';
    label.position.y = radius + (node.kind === 'user' ? 4 : 7);
    group.add(label);
    return group;
  };

  const handleNodeClick = (node) => {
    const graph = graphRef.current;
    if (graph && node.x !== undefined) {
      const distance = 70;
      const ratio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
      graph.cameraPosition({ x: node.x * ratio, y: node.y * ratio, z: node.z * ratio }, node, 1200);
    }
    setSelected(node.kind === 'user' ? node : null);
  };

  const managerName = (u) => users.find((x) => x.id === u.effectiveManagerId)?.fullName || u.effectiveManagerName || 'Aucun';
  const teamSize = (u) => users.filter((x) => x.effectiveManagerId === u.id).length;

  return (
    <div
      ref={containerRef}
      onPointerDown={() => setAutoRotate(false)}
      onWheel={() => setAutoRotate(false)}
      className="relative h-[640px] overflow-hidden rounded-[1.25rem] bg-[#141413]"
    >
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        enableNodeDrag={false}
        width={size.width}
        height={size.height}
        backgroundColor="#141413"
        nodeThreeObject={buildNodeObject}
        nodeLabel={(node) => (node.kind === 'user' ? `${node.name} — ${node.user.role}` : node.name)}
        linkColor={(link) => link.color}
        linkOpacity={0.45}
        linkWidth={(link) => (link.strong ? 1.4 : 0.6)}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={1.6}
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleColor={(link) => link.color}
        onNodeClick={handleNodeClick}
        onBackgroundClick={() => setSelected(null)}
        showNavInfo={false}
        cooldownTicks={120}
      />

      {/* Légende des départements */}
      <div className="pointer-events-none absolute left-5 top-5 space-y-1.5 rounded-2xl bg-black/40 px-4 py-3 backdrop-blur">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">Départements</p>
        {departments.map((d) => (
          <p key={d.key} className="flex items-center gap-2 text-xs text-stone-200">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            {d.label}
          </p>
        ))}
      </div>

      <p className="pointer-events-none absolute bottom-4 left-5 text-[11px] text-stone-500">
        Glisser pour tourner · molette pour zoomer · clic sur une sphère pour les détails
      </p>

      {/* Fiche de la personne sélectionnée */}
      {selected && (
        <div className="absolute right-5 top-5 w-72 animate-scale-in rounded-2xl z-10 border border-white/10 bg-[#1b1b1a] p-5 text-white shadow-2xl">
          <button
            onClick={() => setSelected(null)}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-stone-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Fermer"
          >
            <FiX size={16} />
          </button>
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-medium text-white"
            style={{ backgroundColor: selected.color }}
          >
            {selected.name?.charAt(0).toUpperCase()}
          </span>
          <p className="mt-3 font-['Inter_Tight'] text-xl font-light tracking-[-0.02em]">{selected.name}</p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-stone-400">{selected.user.role}</p>
          <dl className="mt-4 space-y-2.5 border-t border-white/10 pt-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-stone-400"><FiBriefcase size={13} /> Département</dt>
              <dd className="text-right">{selected.user.department || '-'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-stone-400"><FiLayers size={13} /> Niveau</dt>
              <dd>{selected.user.hierarchyLevel}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-stone-400"><FiUser size={13} /> Manager</dt>
              <dd className="text-right">{managerName(selected.user)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-stone-400"><FiUsers size={13} /> Équipe directe</dt>
              <dd>{teamSize(selected.user)} personne(s)</dd>
            </div>
          </dl>
          {selected.user.email && <p className="mt-4 truncate text-xs text-stone-500">{selected.user.email}</p>}
        </div>
      )}
    </div>
  );
};

export default OrgChart3D;
