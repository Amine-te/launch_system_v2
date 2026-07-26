/* ==========================================================================
   dashboards.js
   ========================================================================== */

import { assignedProjectNames, posForProject, projectBomReadiness, visibleProjects } from '../components/shared-tables.js';
import { ADMIN_LOGIN_EVENTS, ADMIN_REFERENCE_LISTS, ADMIN_USERS, AUDIT_LOGS, CUST_DELIVERIES, INVOICES, MATERIALS, MFG_DELIVERIES, PNS, POS, PO_STATUS_FLOW, PROJECTS, REVENUE_ROWS, SIMULATION_HISTORY, STOCK_ALERTS } from '../data/mock-data.js';
import { custEffectiveStatus } from './customer-delivery.js';
import { mfgDeliveryPnQuantities, mfgTable } from './manufacturing-delivery.js';
import { getThreshold } from './materials-stock.js';
import { poFinanceRows } from './projects.js';
import { customerEligibleOrders, mfgLaunchLines, mfgNormalizeLaunchLine, packagedQuantitySummary, poLifecycle, poQuantitySummary, productionQueueHtml, productionStatusType, syncMfgDeliveryLifecycle } from './purchase-orders.js';
import { state } from '../state.js';
import { financeMoney, statusBadge } from '../utils/helpers.js';
import { icon } from '../utils/icons.js';

export function roleDashboard() {
      if (state.currentRole === 'engineer') return dashEngineer();
      if (state.currentRole === 'manager') return dashManager();
      if (state.currentRole === 'plant') return dashPlant();
      if (state.currentRole === 'wh_lead') return dashWarehouseLead();
      if (state.currentRole === 'wh_staff') return dashWarehouseStaff();
      if (state.currentRole === 'prod_coord') return dashProductionPackingCoordinator();
      if (state.currentRole === 'admin') return dashAdmin();
      return '';
    }

export function dashEngineer() {
      const projects = visibleProjects();
      const projectNames = new Set(projects.map(project => project.name));
      const pos = POS.filter(po => projectNames.has(po.project));
      const activePos = pos.filter(po => poLifecycle(po.id) !== 'Delivered');
      const manufacturing = MFG_DELIVERIES.filter(delivery => projectNames.has(delivery.project) && delivery.status !== 'Cancelled');
      const customerDeliveries = CUST_DELIVERIES.filter(delivery => projectNames.has(delivery.project));
      const activeManufacturing = manufacturing.filter(delivery => syncMfgDeliveryLifecycle(delivery) !== 'Delivered');
      const missingBoms = PNS.filter(part => projectNames.has(part.project) && part.bom !== 'Uploaded');
      const pendingSignedValidation = manufacturing.filter(delivery => delivery.docUploaded && delivery.status === 'Signed Document Uploaded');
      const pendingCustomerConfirmation = customerDeliveries.filter(delivery =>
        (delivery.shipments || []).some(shipment => shipment.status !== 'Planned' && !shipment.confirmation)
      );
      const packagedByPo = pos.map(po => ({
        po,
        quantity: customerEligibleOrders(po.id).reduce((sum, item) => sum + packagedQuantitySummary(po.id, item.fgpn).available, 0),
      })).filter(item => item.quantity > 0);
      const packagedReady = packagedByPo.reduce((sum, item) => sum + item.quantity, 0);

      const requiredActions = [
        ...pendingSignedValidation.map(delivery => ({
          tone:'blue', icon:'check', title:'Validate signed manufacturing document', meta:`${delivery.code} · ${delivery.po}`, action:`openMfgDelivery('${delivery.code}')`, label:'Review'
        })),
        ...missingBoms.map(part => ({
          tone:'amber', icon:'bom', title:`Upload BOM for ${part.pn}`, meta:`${part.po} · ${part.project}`, action:`openPo('${part.po}','Part Numbers')`, label:'Open PO'
        })),
        ...packagedByPo.map(item => ({
          tone:'green', icon:'PackageCheck', title:`${item.quantity.toLocaleString()} packaged units ready`, meta:`${item.po.id} · ${item.po.project}`, action:`startProjectCustomerDelivery('${item.po.id}','','po')`, label:'Create delivery'
        })),
        ...pendingCustomerConfirmation.map(delivery => ({
          tone:'amber', icon:'truck', title:'Customer confirmation required', meta:`${delivery.code} · ${delivery.po}`, action:`openCustDelivery('${delivery.code}')`, label:'Confirm'
        })),
      ].slice(0, 6);

      const deliveryActivity = [
        ...manufacturing.map(delivery => ({ code:delivery.code, type:'Manufacturing', po:delivery.po, project:delivery.project, date:delivery.date, status:syncMfgDeliveryLifecycle(delivery), statusType:productionStatusType(delivery.lifecycleStatus), action:`openMfgDelivery('${delivery.code}')` })),
        ...customerDeliveries.map(delivery => ({ code:delivery.code, type:'Customer', po:delivery.po, project:delivery.project, date:delivery.date, status:custEffectiveStatus(delivery).label, statusType:custEffectiveStatus(delivery).type, action:`openCustDelivery('${delivery.code}')` })),
      ].sort((a,b) => String(b.date).localeCompare(String(a.date))).slice(0, 6);
      const dashboardPoStatus = status => ({
        'Unplanned': 'Unplanned',
        'In Progress': 'Production',
        'Done': 'Production Complete',
        'Packaged': 'Packaged',
        'Delivered': 'Delivered',
      }[status] || status);

      return `<div class="engineer-dashboard">
        <div class="engineer-dashboard-head">
          <div><h1>Launch Engineer Dashboard</h1><p>${projects.length} assigned projects · ${activePos.length} active purchase orders</p></div>
          <div class="engineer-dashboard-head-actions"><button class="btn primary" onclick="navigate('project-list')">${icon('projects','')} Projects</button></div>
        </div>

        <div class="engineer-kpi-grid">
          <div class="engineer-kpi-card"><span class="engineer-kpi-icon blue">${icon('projects','')}</span><span class="engineer-kpi-copy"><span>Assigned Projects</span><strong>${projects.length}</strong><small>${pos.length} purchase orders</small></span></div>
          <div class="engineer-kpi-card"><span class="engineer-kpi-icon navy">${icon('po','')}</span><span class="engineer-kpi-copy"><span>Active Purchase Orders</span><strong>${activePos.length}</strong><small>${pos.filter(po => poLifecycle(po.id) === 'Delivered').length} delivered</small></span></div>
          <div class="engineer-kpi-card"><span class="engineer-kpi-icon violet">${icon('truck','')}</span><span class="engineer-kpi-copy"><span>Manufacturing Launches</span><strong>${activeManufacturing.length}</strong><small>Active launch records</small></span></div>
          <div class="engineer-kpi-card"><span class="engineer-kpi-icon green">${icon('PackageCheck','')}</span><span class="engineer-kpi-copy"><span>Packaged Units Ready</span><strong>${packagedReady.toLocaleString()}</strong><small>Available for customer delivery</small></span></div>
        </div>

        <div class="engineer-dashboard-grid">
          <section class="engineer-panel engineer-po-panel">
            <div class="engineer-panel-head"><div><h2>Purchase Order Control</h2><p>Current production and delivery position</p></div><button class="btn sm" onclick="navigate('po-list')">View all ${icon('chevRight','')}</button></div>
            <div class="engineer-table-wrap"><table class="engineer-po-table"><thead><tr><th>Purchase Order</th><th>Project</th><th>Due Date</th><th>Status</th><th>Production</th><th>Packaged</th><th>Delivered</th><th></th></tr></thead><tbody>
              ${pos.map(po => { const quantities=poQuantitySummary(po.id), status=poLifecycle(po.id), pct=value => quantities.ordered ? Math.min(100,Math.round(value/quantities.ordered*100)) : 0; return `<tr onclick="openPo('${po.id}','Overview')"><td><strong class="mono">${po.id}</strong><span>${po.customer}</span></td><td><strong>${po.project}</strong></td><td><strong class="mono">${po.delivery || '—'}</strong></td><td>${statusBadge(dashboardPoStatus(status),productionStatusType(status))}</td><td><div class="engineer-quantity"><strong>${quantities.produced.toLocaleString()} / ${quantities.ordered.toLocaleString()}</strong><span><i style="width:${pct(quantities.produced)}%"></i></span></div></td><td><div class="engineer-quantity"><strong>${quantities.packaged.toLocaleString()}</strong><span><i style="width:${pct(quantities.packaged)}%"></i></span></div></td><td><div class="engineer-quantity"><strong>${quantities.delivered.toLocaleString()}</strong><span><i style="width:${pct(quantities.delivered)}%"></i></span></div></td><td><button class="engineer-row-open" aria-label="Open ${po.id}">${icon('chevRight','')}</button></td></tr>`; }).join('')}
            </tbody></table></div>
          </section>

          <aside class="engineer-panel engineer-actions-panel">
            <div class="engineer-panel-head"><div><h2>Required Actions</h2><p>${requiredActions.length} open item${requiredActions.length === 1 ? '' : 's'}</p></div></div>
            <div class="engineer-action-list">${requiredActions.length ? requiredActions.map(item => `<div class="engineer-action-item"><span class="engineer-action-icon ${item.tone}">${icon(item.icon,'')}</span><div><strong>${item.title}</strong><span>${item.meta}</span></div><button class="btn sm" onclick="${item.action}">${item.label}</button></div>`).join('') : `<div class="engineer-no-action">${icon('check','')}<strong>No action required</strong></div>`}</div>
          </aside>
        </div>

        <section class="engineer-panel engineer-activity-panel">
          <div class="engineer-panel-head"><div><h2>Delivery Activity</h2><p>Manufacturing and customer delivery records</p></div><div class="engineer-panel-links"><button class="btn sm" onclick="navigate('mfg-delivery-list')">Manufacturing ${icon('chevRight','')}</button><button class="btn sm" onclick="navigate('cust-delivery-list')">Customer ${icon('chevRight','')}</button></div></div>
          <div class="engineer-activity-grid">${deliveryActivity.map(item => `<button class="engineer-activity-item" onclick="${item.action}"><span class="engineer-activity-type ${item.type === 'Manufacturing' ? 'manufacturing' : 'customer'}">${item.type === 'Manufacturing' ? icon('stock','') : icon('truck','')}</span><span class="engineer-activity-main"><strong class="mono">${item.code}</strong><small>${item.po} · ${item.project}</small></span><span class="engineer-delivery-kind ${item.type === 'Manufacturing' ? 'manufacturing' : 'customer'}">${item.type}</span><span class="engineer-activity-date">${item.date}</span>${statusBadge(item.status,item.statusType)}${icon('chevRight','')}</button>`).join('')}</div>
        </section>
      </div>`;
    }

export function dashManager() {
      const projects = visibleProjects();
      const projectNames = new Set(projects.map(project => project.name));
      const pos = POS.filter(po => projectNames.has(po.project));
      const assigned = assignedProjectNames();
      const activePos = pos.filter(po => poLifecycle(po.id) !== 'Delivered');
      const bomTotal = projects.reduce((sum, project) => sum + projectBomReadiness(project.name).total, 0);
      const bomUploaded = projects.reduce((sum, project) => sum + projectBomReadiness(project.name).uploaded, 0);
      const bomCoverage = bomTotal ? Math.round((bomUploaded / bomTotal) * 100) : 0;
      const portfolioValue = pos.flatMap(po => poFinanceRows(po.id)).reduce((sum, row) => sum + row.lineTotal, 0);
      const simulations = SIMULATION_HISTORY.filter(run => projectNames.has(run.project));
      const passedSimulations = simulations.filter(run => run.result === 'YES').length;
      const simulationRate = simulations.length ? Math.round((passedSimulations / simulations.length) * 100) : 0;
      const failedSimulations = simulations.filter(run => run.result !== 'YES');
      const manufacturing = MFG_DELIVERIES.filter(delivery => projectNames.has(delivery.project));
      const customerDeliveries = CUST_DELIVERIES.filter(delivery => projectNames.has(delivery.project));
      const activeManufacturing = manufacturing.filter(delivery => !['Delivered','Cancelled'].includes(syncMfgDeliveryLifecycle(delivery)));
      const openCustomerDeliveries = customerDeliveries.filter(delivery => !['Delivered','Cancelled'].includes(custEffectiveStatus(delivery).label));
      const pendingSignedValidation = manufacturing.filter(delivery => delivery.docUploaded && delivery.status === 'Signed Document Uploaded');
      const pendingCustomerConfirmation = customerDeliveries.filter(delivery =>
        (delivery.shipments || []).some(shipment => shipment.status !== 'Planned' && !shipment.confirmation)
      );
      const missingBoms = PNS.filter(part => projectNames.has(part.project) && part.bom !== 'Uploaded');
      const lowStock = MATERIALS.filter(material => material.warehouse < getThreshold(material.code));
      const riskProjects = projects.filter(project => project.status === 'At Risk' || project.status === 'Blocked');
      const lifecycleCounts = PO_STATUS_FLOW.map(status => ({
        status,
        count:pos.filter(po => poLifecycle(po.id) === status).length,
      }));

      const managementActions = [
        ...projects.filter(project => project.status === 'Blocked').map(project => ({
          tone:'red', icon:'alert', title:`${project.name} is blocked`, meta:`${project.engineer} · ${project.site}`, action:`openProject('${project.id}')`, label:'Open'
        })),
        ...projects.filter(project => project.status === 'At Risk').map(project => ({
          tone:'amber', icon:'alert', title:`${project.name} is at risk`, meta:`Target ${project.targetDate} · ${project.progress}% schedule`, action:`openProject('${project.id}')`, label:'Review'
        })),
        ...pendingSignedValidation.map(delivery => ({
          tone:'blue', icon:'check', title:'Signed transfer needs validation', meta:`${delivery.code} · ${delivery.po}`, action:`openMfgDelivery('${delivery.code}')`, label:'Validate'
        })),
        ...pendingCustomerConfirmation.map(delivery => ({
          tone:'violet', icon:'truck', title:'Customer confirmation required', meta:`${delivery.code} · ${delivery.po}`, action:`openCustDelivery('${delivery.code}')`, label:'Confirm'
        })),
        ...failedSimulations.map(run => ({
          tone:'red', icon:'sim', title:`Simulation blocked for ${run.project}`, meta:`${run.id} · ${run.missingCount} missing materials`, action:`navigate('sim-launch')`, label:'Open'
        })),
        ...missingBoms.slice(0, 2).map(part => ({
          tone:'amber', icon:'bom', title:`BOM missing for ${part.pn}`, meta:`${part.po} · ${part.project}`, action:`openPo('${part.po}','Part Numbers')`, label:'Open PO'
        })),
      ];

      const deliveryActivity = [
        ...manufacturing.map(delivery => ({
          code:delivery.code, type:'Manufacturing', po:delivery.po, project:delivery.project, date:delivery.date,
          status:syncMfgDeliveryLifecycle(delivery), statusType:productionStatusType(delivery.lifecycleStatus),
          action:`openMfgDelivery('${delivery.code}')`
        })),
        ...customerDeliveries.map(delivery => ({
          code:delivery.code, type:'Customer', po:delivery.po, project:delivery.project, date:delivery.date,
          status:custEffectiveStatus(delivery).label, statusType:custEffectiveStatus(delivery).type,
          action:`openCustDelivery('${delivery.code}')`
        })),
      ].sort((a,b) => String(b.date).localeCompare(String(a.date))).slice(0, 6);

      const engineers = [...new Set(projects.map(project => project.engineer))].map(engineer => {
        const ownedProjects = projects.filter(project => project.engineer === engineer);
        const ownedNames = new Set(ownedProjects.map(project => project.name));
        const ownedPos = pos.filter(po => ownedNames.has(po.project));
        return {
          engineer,
          projects:ownedProjects,
          pos:ownedPos,
          risks:ownedProjects.filter(project => project.status !== 'On Track').length,
        };
      });

      const lifecycleSummary = poList => {
        const counts = PO_STATUS_FLOW.map(status => ({ status, count:poList.filter(po => poLifecycle(po.id) === status).length })).filter(item => item.count);
        return counts.length ? counts.map(item => `<span>${item.count} ${item.status}</span>`).join('') : '<span>No POs</span>';
      };

      return `<div class="manager-dashboard">
        <header class="manager-dashboard-head">
          <div>
            <h1>Launch Manager Dashboard</h1>
            <div class="manager-dashboard-scope"><span>${projects.length} projects</span><span>${pos.length} purchase orders</span><span>${assigned.size} assigned to you</span></div>
          </div>
          <div class="manager-dashboard-head-actions">
            <button class="btn" onclick="navigate('audit-logs')">${icon('audit','')} Audit</button>
            <button class="btn primary" onclick="navigate('project-list')">${icon('projects','')} Open Projects</button>
          </div>
        </header>

        <section class="manager-kpi-grid">
          <div class="manager-kpi-card">
            <span class="manager-kpi-icon blue">${icon('projects','')}</span>
            <span><small>Portfolio Projects</small><strong>${projects.length}</strong><em>${riskProjects.length} require attention</em></span>
          </div>
          <div class="manager-kpi-card">
            <span class="manager-kpi-icon navy">${icon('po','')}</span>
            <span><small>Active Purchase Orders</small><strong>${activePos.length}</strong><em>${pos.length - activePos.length} delivered</em></span>
          </div>
          <div class="manager-kpi-card">
            <span class="manager-kpi-icon amber">${icon('bom','')}</span>
            <span><small>BOM Readiness</small><strong>${bomCoverage}%</strong><em>${missingBoms.length} PN BOM${missingBoms.length === 1 ? '' : 's'} missing</em></span>
          </div>
          <div class="manager-kpi-card">
            <span class="manager-kpi-icon green">${icon('money','')}</span>
            <span><small>Portfolio PO Value</small><strong>${financeMoney(portfolioValue)}</strong><em>Current PO versions</em></span>
          </div>
        </section>

        <section class="manager-lifecycle-panel">
          <div class="manager-panel-title"><div><h2>Purchase Order Lifecycle</h2><span>${pos.length} purchase orders</span></div></div>
          <div class="manager-lifecycle-grid">
            ${lifecycleCounts.map((item,index) => `<button onclick="navigate('project-list')" class="manager-life-stage stage-${index}">
              <span class="manager-life-index">${index + 1}</span>
              <span class="manager-life-copy"><small>${item.status}</small><strong>${item.count}</strong></span>
            </button>`).join('')}
          </div>
        </section>

        <div class="manager-main-grid">
          <section class="manager-panel manager-portfolio-panel">
            <div class="manager-panel-head"><div><h2>Project Portfolio</h2><span>Schedule, PO lifecycle, BOM and health</span></div><button class="btn sm" onclick="navigate('project-list')">View all ${icon('chevRight','')}</button></div>
            <div class="manager-table-wrap"><table class="manager-project-table"><thead><tr><th>Project</th><th>Responsible</th><th>Schedule</th><th>PO Lifecycle</th><th>BOM</th><th>Health</th><th></th></tr></thead><tbody>
              ${projects.map(project => {
                const projectPos = posForProject(project.name);
                const readiness = projectBomReadiness(project.name);
                const healthType = project.health >= 80 ? 'success' : project.health >= 60 ? 'info' : project.health >= 40 ? 'warning' : 'danger';
                return `<tr onclick="openProject('${project.id}')">
                  <td><strong>${project.name}</strong><span>${project.id} · ${project.customer}</span></td>
                  <td><strong>${project.engineer}</strong><span>${project.site}</span></td>
                  <td><div class="manager-progress-head"><strong>${project.progress}%</strong>${statusBadge(project.status,project.statusType)}</div><div class="manager-progress"><i style="width:${project.progress}%"></i></div><span>Target ${project.targetDate}</span></td>
                  <td><strong>${projectPos.length} purchase order${projectPos.length === 1 ? '' : 's'}</strong><div class="manager-lifecycle-summary">${lifecycleSummary(projectPos)}</div></td>
                  <td><strong>${readiness.percent}%</strong><div class="manager-progress bom"><i style="width:${readiness.percent}%"></i></div><span>${readiness.uploaded}/${readiness.total} PN BOMs</span></td>
                  <td>${statusBadge(`${project.health}%`,healthType)}<span>${project.health >= 80 ? 'Healthy' : project.health >= 40 ? 'Watch' : 'Critical'}</span></td>
                  <td><button class="manager-row-open" aria-label="Open ${project.name}">${icon('chevRight','')}</button></td>
                </tr>`;
              }).join('')}
            </tbody></table></div>
          </section>

          <aside class="manager-panel manager-actions-panel">
            <div class="manager-panel-head"><div><h2>Management Actions</h2><span>${managementActions.length} open item${managementActions.length === 1 ? '' : 's'}</span></div></div>
            <div class="manager-action-list">
              ${managementActions.length ? managementActions.slice(0, 7).map(item => `<div class="manager-action-item">
                <span class="manager-action-icon ${item.tone}">${icon(item.icon,'')}</span>
                <div><strong>${item.title}</strong><span>${item.meta}</span></div>
                <button class="btn sm" onclick="${item.action}">${item.label}</button>
              </div>`).join('') : `<div class="manager-empty">${icon('check','')}<strong>No action required</strong></div>`}
            </div>
          </aside>
        </div>

        <section class="manager-control-grid">
          <article class="manager-panel">
            <div class="manager-panel-head"><div><h2>Delivery Oversight</h2><span>${activeManufacturing.length} manufacturing · ${openCustomerDeliveries.length} customer open</span></div></div>
            <div class="manager-delivery-list">
              ${deliveryActivity.map(item => `<button class="manager-delivery-item" onclick="${item.action}">
                <span class="manager-delivery-icon ${item.type === 'Manufacturing' ? 'manufacturing' : 'customer'}">${icon(item.type === 'Manufacturing' ? 'stock' : 'truck','')}</span>
                <span class="manager-delivery-main"><strong class="mono">${item.code}</strong><small>${item.po} · ${item.project}</small></span>
                <span class="manager-delivery-date">${item.date}</span>
                ${statusBadge(item.status,item.statusType)}
                ${icon('chevRight','')}
              </button>`).join('')}
            </div>
          </article>

          <article class="manager-panel">
            <div class="manager-panel-head"><div><h2>Operational Control</h2><span>Current portfolio indicators</span></div></div>
            <div class="manager-control-metrics">
              <button onclick="navigate('sim-launch')"><span class="manager-control-icon blue">${icon('sim','')}</span><span><small>Simulation Success</small><strong>${simulationRate}%</strong><em>${passedSimulations}/${simulations.length} passed</em></span></button>
              <button onclick="navigate('stock-dashboard')"><span class="manager-control-icon red">${icon('alert','')}</span><span><small>Low Stock Materials</small><strong>${lowStock.length}</strong><em>Below configured threshold</em></span></button>
              <button onclick="navigate('project-list')"><span class="manager-control-icon amber">${icon('bom','')}</span><span><small>Missing PN BOMs</small><strong>${missingBoms.length}</strong><em>${bomCoverage}% portfolio coverage</em></span></button>
              <button onclick="navigate('audit-logs')"><span class="manager-control-icon violet">${icon('audit','')}</span><span><small>Pending Validations</small><strong>${pendingSignedValidation.length + pendingCustomerConfirmation.length}</strong><em>Documents and confirmations</em></span></button>
            </div>
          </article>

          <article class="manager-panel">
            <div class="manager-panel-head"><div><h2>Team Ownership</h2><span>${engineers.length} launch engineers</span></div></div>
            <div class="manager-team-list">
              ${engineers.map(member => `<button onclick="openProject('${member.projects[0].id}')" class="manager-team-item">
                <span class="manager-team-avatar">${member.engineer.split(' ').map(part => part[0]).join('').slice(0,2)}</span>
                <span><strong>${member.engineer}</strong><small>${member.projects.length} project${member.projects.length === 1 ? '' : 's'} · ${member.pos.length} POs</small></span>
                <span class="manager-team-risk ${member.risks ? 'has-risk' : ''}">${member.risks ? `${member.risks} risk` : 'On track'}</span>
                ${icon('chevRight','')}
              </button>`).join('')}
            </div>
          </article>
        </section>
      </div>`;
    }

export function dashPlant() {
      const projects = PROJECTS;
      const pos = POS;
      const totalRevenue = REVENUE_ROWS.reduce((sum, row) => sum + row.revenue, 0);
      const totalForecast = REVENUE_ROWS.reduce((sum, row) => sum + row.forecast, 0);
      const forecastAttainment = totalForecast ? Math.round((totalRevenue / totalForecast) * 100) : 0;
      const outstandingInvoices = INVOICES.filter(invoice => ['Outstanding','Overdue'].includes(invoice.status));
      const outstandingValue = outstandingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
      const projectHealth = projects.length ? Math.round(projects.reduce((sum, project) => sum + project.health, 0) / projects.length) : 0;
      const riskProjects = projects.filter(project => project.status !== 'On Track');
      const blockedProjects = projects.filter(project => project.status === 'Blocked');
      const simulations = SIMULATION_HISTORY;
      const passedSimulations = simulations.filter(run => run.result === 'YES').length;
      const simulationRate = simulations.length ? Math.round((passedSimulations / simulations.length) * 100) : 0;
      const bomTotal = PNS.length;
      const bomUploaded = PNS.filter(part => part.bom === 'Uploaded').length;
      const bomCoverage = bomTotal ? Math.round((bomUploaded / bomTotal) * 100) : 0;
      const missingBoms = PNS.filter(part => part.bom !== 'Uploaded');
      const lowStock = MATERIALS.filter(material => material.warehouse < getThreshold(material.code));
      const lifecycleCounts = PO_STATUS_FLOW.map(status => ({
        status,
        count:pos.filter(po => poLifecycle(po.id) === status).length,
      }));
      const customerQuantity = CUST_DELIVERIES.reduce((sum, delivery) => sum + Number(delivery.qty || 0), 0);
      const customerDelivered = CUST_DELIVERIES.reduce((sum, delivery) => sum + Number(delivery.delivered || 0), 0);
      const deliveryRate = customerQuantity ? Math.round((customerDelivered / customerQuantity) * 100) : 0;
      const openCustomerDeliveries = CUST_DELIVERIES.filter(delivery => !['Delivered','Cancelled'].includes(custEffectiveStatus(delivery).label));
      const pendingCustomerConfirmation = CUST_DELIVERIES.filter(delivery =>
        (delivery.shipments || []).some(shipment => shipment.status !== 'Planned' && !shipment.confirmation)
      );
      const activeManufacturing = MFG_DELIVERIES.filter(delivery => delivery.status !== 'Cancelled' && syncMfgDeliveryLifecycle(delivery) !== 'Delivered');
      const auditThisWeek = AUDIT_LOGS.filter(log => log.date >= '2026-07-16').length;

      const executiveAlerts = [
        ...blockedProjects.map(project => ({
          tone:'red', icon:'alert', title:`${project.name} is blocked`, meta:`${project.engineer} · ${project.progress}% schedule`, action:`openProject('${project.id}')`, label:'View'
        })),
        ...projects.filter(project => project.status === 'At Risk').map(project => ({
          tone:'amber', icon:'alert', title:`${project.name} is at risk`, meta:`Target ${project.targetDate}`, action:`openProject('${project.id}')`, label:'Review'
        })),
        ...INVOICES.filter(invoice => invoice.status === 'Overdue').map(invoice => ({
          tone:'red', icon:'invoice', title:`Invoice ${invoice.id} is overdue`, meta:`${invoice.project} · ${financeMoney(invoice.amount)}`, action:`navigate('finance-invoices')`, label:'Finance'
        })),
        ...pendingCustomerConfirmation.map(delivery => ({
          tone:'violet', icon:'truck', title:'Customer confirmation pending', meta:`${delivery.code} · ${delivery.project}`, action:`openCustDelivery('${delivery.code}')`, label:'View'
        })),
        ...(lowStock.length ? [{
          tone:'amber', icon:'stock', title:`${lowStock.length} materials below threshold`, meta:lowStock.map(material => material.code).join(', '), action:`navigate('stock-dashboard')`, label:'Stock'
        }] : []),
        ...missingBoms.slice(0, 1).map(part => ({
          tone:'blue', icon:'bom', title:`BOM missing for ${part.pn}`, meta:`${part.po} · ${part.project}`, action:`openProject('${PROJECTS.find(project => project.name === part.project)?.id || ''}')`, label:'Project'
        })),
      ];

      const revenueMax = Math.max(...REVENUE_ROWS.map(row => Math.max(row.revenue,row.forecast)), 1);
      const customerActivity = [...CUST_DELIVERIES]
        .sort((a,b) => String(b.date).localeCompare(String(a.date)))
        .slice(0, 5);

      return `<div class="plant-dashboard">
        <header class="plant-dashboard-head">
          <div>
            <h1>Plant Manager Dashboard</h1>
            <div class="plant-dashboard-scope">
              <span>${projects.length} projects</span>
              <span>${pos.length} purchase orders</span>
              <span>Plant-wide read-only view</span>
            </div>
          </div>
          <div class="plant-dashboard-head-actions">
            <button class="btn" onclick="navigate('reports')">${icon('reports','')} Reports</button>
            <button class="btn" onclick="navigate('audit-logs')">${icon('audit','')} Audit</button>
            <button class="btn primary" onclick="navigate('finance-dashboard')">${icon('money','')} Finance</button>
          </div>
        </header>

        <section class="plant-kpi-grid">
          <div class="plant-kpi-card">
            <span class="plant-kpi-icon green">${icon('money','')}</span>
            <span><small>Revenue</small><strong>${financeMoney(totalRevenue)}</strong><em>${forecastAttainment}% of forecast</em></span>
          </div>
          <div class="plant-kpi-card">
            <span class="plant-kpi-icon blue">${icon('projects','')}</span>
            <span><small>Portfolio Health</small><strong>${projectHealth}%</strong><em>${riskProjects.length} projects require attention</em></span>
          </div>
          <div class="plant-kpi-card">
            <span class="plant-kpi-icon navy">${icon('truck','')}</span>
            <span><small>Customer Delivery</small><strong>${deliveryRate}%</strong><em>${customerDelivered.toLocaleString()} of ${customerQuantity.toLocaleString()} units</em></span>
          </div>
          <div class="plant-kpi-card">
            <span class="plant-kpi-icon red">${icon('invoice','')}</span>
            <span><small>Outstanding Invoices</small><strong>${financeMoney(outstandingValue)}</strong><em>${outstandingInvoices.length} open invoice${outstandingInvoices.length === 1 ? '' : 's'}</em></span>
          </div>
        </section>

        <section class="plant-lifecycle-panel">
          <div class="plant-panel-head"><div><h2>Purchase Order Lifecycle</h2><span>${pos.length} purchase orders across all projects</span></div></div>
          <div class="plant-lifecycle-grid">
            ${lifecycleCounts.map((item,index) => `<button onclick="navigate('project-list')" class="plant-life-stage stage-${index}">
              <span>${index + 1}</span>
              <div><small>${item.status}</small><strong>${item.count}</strong></div>
            </button>`).join('')}
          </div>
        </section>

        <div class="plant-main-grid">
          <section class="plant-panel plant-project-panel">
            <div class="plant-panel-head"><div><h2>Project Performance</h2><span>Schedule, lifecycle, financial position and health</span></div><button class="btn sm" onclick="navigate('project-list')">View Projects ${icon('chevRight','')}</button></div>
            <div class="plant-table-wrap"><table class="plant-project-table"><thead><tr><th>Project</th><th>Responsible</th><th>Schedule</th><th>Purchase Orders</th><th>BOM</th><th>Revenue</th><th>Health</th><th></th></tr></thead><tbody>
              ${projects.map(project => {
                const projectPos = posForProject(project.name);
                const readiness = projectBomReadiness(project.name);
                const revenue = REVENUE_ROWS.find(row => row.project === project.name) || { revenue:0, forecast:0 };
                const lifecycle = PO_STATUS_FLOW.map(status => ({ status, count:projectPos.filter(po => poLifecycle(po.id) === status).length })).filter(item => item.count);
                const healthType = project.health >= 80 ? 'success' : project.health >= 40 ? 'warning' : 'danger';
                return `<tr onclick="openProject('${project.id}')">
                  <td><strong>${project.name}</strong><span>${project.id} · ${project.customer}</span></td>
                  <td><strong>${project.engineer}</strong><span>${project.site}</span></td>
                  <td><div class="plant-progress-head"><strong>${project.progress}%</strong>${statusBadge(project.status,project.statusType)}</div><div class="plant-progress"><i style="width:${project.progress}%"></i></div><span>Target ${project.targetDate}</span></td>
                  <td><strong>${projectPos.length} purchase order${projectPos.length === 1 ? '' : 's'}</strong><div class="plant-po-summary">${lifecycle.map(item => `<span>${item.count} ${item.status}</span>`).join('')}</div></td>
                  <td><strong>${readiness.percent}%</strong><div class="plant-progress bom"><i style="width:${readiness.percent}%"></i></div><span>${readiness.uploaded}/${readiness.total} PN BOMs</span></td>
                  <td><strong>${financeMoney(revenue.revenue)}</strong><span>${revenue.forecast ? Math.round(revenue.revenue / revenue.forecast * 100) : 0}% of forecast</span></td>
                  <td>${statusBadge(`${project.health}%`,healthType)}<span>${project.health >= 80 ? 'Healthy' : project.health >= 40 ? 'Watch' : 'Critical'}</span></td>
                  <td><button class="plant-row-open" aria-label="Open ${project.name}">${icon('chevRight','')}</button></td>
                </tr>`;
              }).join('')}
            </tbody></table></div>
          </section>

          <aside class="plant-panel plant-alert-panel">
            <div class="plant-panel-head"><div><h2>Executive Attention</h2><span>${executiveAlerts.length} open item${executiveAlerts.length === 1 ? '' : 's'}</span></div></div>
            <div class="plant-alert-list">
              ${executiveAlerts.length ? executiveAlerts.slice(0, 7).map(item => `<div class="plant-alert-item">
                <span class="plant-alert-icon ${item.tone}">${icon(item.icon,'')}</span>
                <div><strong>${item.title}</strong><span>${item.meta}</span></div>
                <button class="btn sm" onclick="${item.action}">${item.label}</button>
              </div>`).join('') : `<div class="plant-empty">${icon('check','')}<strong>No executive action required</strong></div>`}
            </div>
          </aside>
        </div>

        <section class="plant-lower-grid">
          <article class="plant-panel">
            <div class="plant-panel-head"><div><h2>Financial Performance</h2><span>${financeMoney(totalRevenue)} actual · ${financeMoney(totalForecast)} forecast</span></div><button class="btn sm" onclick="navigate('finance-dashboard')">Open Finance</button></div>
            <div class="plant-finance-list">
              ${REVENUE_ROWS.map(row => {
                const actualPct = Math.min(100,Math.round(row.revenue / revenueMax * 100));
                const forecastPct = Math.min(100,Math.round(row.forecast / revenueMax * 100));
                const variance = row.revenue - row.forecast;
                return `<button onclick="openProject('${PROJECTS.find(project => project.name === row.project)?.id || ''}')" class="plant-finance-row">
                  <span class="plant-finance-name"><strong>${row.project}</strong><small>${row.customer}</small></span>
                  <span class="plant-finance-bars"><i class="forecast" style="width:${forecastPct}%"></i><i class="actual" style="width:${actualPct}%"></i></span>
                  <span class="plant-finance-values"><strong>${financeMoney(row.revenue)}</strong><small class="${variance < 0 ? 'negative' : 'positive'}">${variance < 0 ? '−' : '+'}${financeMoney(Math.abs(variance))}</small></span>
                </button>`;
              }).join('')}
            </div>
            <div class="plant-chart-legend"><span><i class="actual"></i>Actual</span><span><i class="forecast"></i>Forecast</span></div>
          </article>

          <article class="plant-panel">
            <div class="plant-panel-head"><div><h2>Customer Delivery Status</h2><span>${openCustomerDeliveries.length} open delivery records</span></div></div>
            <div class="plant-delivery-list">
              ${customerActivity.map(delivery => {
                const effective = custEffectiveStatus(delivery);
                return `<button onclick="openCustDelivery('${delivery.code}')">
                  <span class="plant-delivery-icon">${icon('truck','')}</span>
                  <span><strong class="mono">${delivery.code}</strong><small>${delivery.project} · ${delivery.po}</small></span>
                  <span class="plant-delivery-qty"><strong>${Number(delivery.delivered || 0).toLocaleString()} / ${Number(delivery.qty || 0).toLocaleString()}</strong><small>Delivered units</small></span>
                  ${statusBadge(effective.label,effective.type)}
                  ${icon('chevRight','')}
                </button>`;
              }).join('')}
            </div>
          </article>

          <article class="plant-panel">
            <div class="plant-panel-head"><div><h2>Plant Control</h2><span>Operational indicators</span></div></div>
            <div class="plant-control-grid">
              <button onclick="navigate('project-list')"><span class="plant-control-icon blue">${icon('sim','')}</span><span><small>Launch Simulations</small><strong>${simulationRate}%</strong><em>${passedSimulations}/${simulations.length} successful</em></span></button>
              <button onclick="navigate('project-list')"><span class="plant-control-icon amber">${icon('bom','')}</span><span><small>BOM Coverage</small><strong>${bomCoverage}%</strong><em>${missingBoms.length} missing</em></span></button>
              <button onclick="navigate('stock-dashboard')"><span class="plant-control-icon red">${icon('stock','')}</span><span><small>Stock Exposure</small><strong>${lowStock.length}</strong><em>Below threshold</em></span></button>
              <button onclick="navigate('project-list')"><span class="plant-control-icon violet">${icon('truck','')}</span><span><small>Active MFG Launches</small><strong>${activeManufacturing.length}</strong><em>Manufacturing transfers</em></span></button>
              <button onclick="navigate('audit-logs')"><span class="plant-control-icon navy">${icon('audit','')}</span><span><small>Audit Events</small><strong>${auditThisWeek}</strong><em>Since 16 July</em></span></button>
              <button onclick="navigate('reports')"><span class="plant-control-icon green">${icon('reports','')}</span><span><small>Plant Reports</small><strong>${projects.length}</strong><em>Project reporting scopes</em></span></button>
            </div>
          </article>
        </section>
      </div>`;
    }

export function dashWarehouseLead() {
      return `
  <div class="page-title-row"><div><div class="page-title">Warehouse Dashboard</div><div class="page-sub">Pending deliveries, today's deliveries, low stock, transit</div></div></div>
  <div class="grid g4" style="margin-bottom:16px;">
    <div class="kpi-card"><div class="kpi-label">Pending Deliveries</div><div class="kpi-value">${MFG_DELIVERIES.filter(d => d.status === 'Pending Approval').length}</div></div>
    <div class="kpi-card"><div class="kpi-label">Today's Deliveries</div><div class="kpi-value">1</div></div>
    <div class="kpi-card"><div class="kpi-label">Transit Stock</div><div class="kpi-value">1,120</div></div>
    <div class="kpi-card"><div class="kpi-label">Low Stock Items</div><div class="kpi-value" style="color:var(--danger)">2</div></div>
  </div>
  <div class="card" style="margin-bottom:16px;">
    <div class="section-title">Warehouse Activity <span class="hint">Manufacturing deliveries</span></div>
    ${mfgTable(MFG_DELIVERIES.slice(0, 4))}
  </div>
  <div class="card"><div class="section-title">Low Stock</div>
    ${STOCK_ALERTS.map(a => `<div style="display:flex; justify-content:space-between; align-items:center; padding:9px 0; border-bottom:1px solid var(--border-soft);">
      <div><div class="mono" style="font-size:12px;">${a.code}</div><div style="font-size:11.5px; color:var(--ink-faint);">${a.desc}</div></div>
      ${statusBadge(a.level, a.statusType)}
    </div>`).join('')}
  </div>`;
    }

export function dashWarehouseStaff() {
      return `
  <div class="page-title-row"><div><div class="page-title">Reception Dashboard</div><div class="page-sub">Record supplier receipts only — other operational areas are restricted</div></div></div>
  <div class="grid g3" style="margin-bottom:16px;">
    <div class="kpi-card"><div class="kpi-label">Receipts today</div><div class="kpi-value">7</div></div>
    <div class="kpi-card"><div class="kpi-label">Units received</div><div class="kpi-value">1,840</div></div>
    <div class="kpi-card"><div class="kpi-label">Correction window</div><div class="kpi-value" style="font-size:16px;">24 hours</div></div>
  </div>
  <div class="card">
    <div class="section-title">Start a material reception</div>
    <p style="color:var(--ink-soft); font-size:12.5px; margin-bottom:14px;">Search by material part number or description, then record the quantity received. Your entry is timestamped and becomes immutable after 24 hours.</p>
    <button class="btn primary" onclick="navigate('stock-reception')">Open Stock Reception</button>
  </div>`;
    }

export function dashProductionPackingCoordinator() {
      const productionLines = mfgLaunchLines().filter(item => item.line.status === 'In Progress');
      const packingLines = mfgLaunchLines().filter(item => item.line.status === 'Done');
      const queue = MFG_DELIVERIES.filter(delivery => delivery.status !== 'Cancelled' && mfgDeliveryPnQuantities(delivery).some(line => ['In Progress','Done'].includes(mfgNormalizeLaunchLine(delivery,line).status)));
      return `
  <div class="page-title-row"><div><div class="page-title">Production &amp; Packing Dashboard</div><div class="page-sub">Confirm production completion and packaging from one controlled work queue</div></div></div>
  <div class="grid g4" style="margin-bottom:16px;">
    <div class="kpi-card"><div class="kpi-label">In production</div><div class="kpi-value">${productionLines.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">Waiting to pack</div><div class="kpi-value" style="color:var(--warning)">${packingLines.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">Active launches</div><div class="kpi-value" style="color:var(--success)">${queue.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">Priority launches</div><div class="kpi-value">${queue.filter(delivery => delivery.priority === 'High' || delivery.priority === 'Urgent').length}</div></div>
  </div>
  <div class="card"><div class="section-title">Production &amp; packing queue <button class="btn sm primary" onclick="navigate('production-packing')">Open full queue</button></div>
    ${productionQueueHtml(queue)}
  </div>`;
    }

export function dashAdmin() {
      const active = ADMIN_USERS.filter(user => user.status === 'Active').length;
      const inactive = ADMIN_USERS.filter(user => user.status === 'Inactive').length;
      const locked = ADMIN_USERS.filter(user => user.locked).length;
      const failures = ADMIN_LOGIN_EVENTS.filter(event => event.result === 'Failed').length;
      const referenceEntries = Object.values(ADMIN_REFERENCE_LISTS).reduce((sum,list) => sum + list.entries.length,0);
      const attentionUsers = ADMIN_USERS.filter(user => user.locked || user.status === 'Inactive');
      return `<div class="admin-shell">
  <div class="admin-head"><div><h2>Administration</h2></div><div class="admin-head-actions"><button class="btn primary" onclick="adminOpenUserForm('create')">${icon('plus','')} Create User</button></div></div>
  <div class="admin-kpis">
    <div class="admin-kpi"><div class="admin-kpi-top"><span class="admin-kpi-label">Active Accounts</span><span class="admin-kpi-icon">${icon('users','')}</span></div><div class="admin-kpi-value">${active}</div></div>
    <div class="admin-kpi"><div class="admin-kpi-top"><span class="admin-kpi-label">Locked Accounts</span><span class="admin-kpi-icon">${icon('lock','')}</span></div><div class="admin-kpi-value" style="color:${locked ? 'var(--danger)' : '#000'};">${locked}</div></div>
    <div class="admin-kpi"><div class="admin-kpi-top"><span class="admin-kpi-label">Failed Logins</span><span class="admin-kpi-icon">${icon('alert','')}</span></div><div class="admin-kpi-value">${failures}</div></div>
    <div class="admin-kpi"><div class="admin-kpi-top"><span class="admin-kpi-label">Reference Entries</span><span class="admin-kpi-icon">${icon('columns','')}</span></div><div class="admin-kpi-value">${referenceEntries}</div></div>
  </div>
  <div class="admin-grid">
    <div class="card admin-card"><div class="admin-card-head"><h3>Access Attention</h3>${statusBadge(`${locked + inactive} records`,locked ? 'warning' : 'neutral')}</div>
      <div class="admin-attention-list">${attentionUsers.length ? attentionUsers.map(user => `<div class="admin-attention"><div class="admin-attention-icon ${user.locked ? 'danger' : ''}">${icon(user.locked ? 'lock' : 'users','')}</div><div><strong>${user.fullName}</strong><span>${user.locked ? `${user.failedAttempts} failed attempts · account locked` : 'Account inactive · login blocked'}</span></div><button class="btn sm" onclick="openAdminUser('${user.id}')">Review</button></div>`).join('') : `<div class="empty-state" style="padding:24px;"><div class="e-title">No access issues</div></div>`}</div>
    </div>
    <div class="card admin-card"><div class="admin-card-head"><h3>Administration Areas</h3></div>
      <div class="admin-quick-grid">
        <button class="admin-quick-action" onclick="navigate('admin-users')">${icon('users','')}<strong>User Accounts</strong></button>
        <button class="admin-quick-action" onclick="navigate('admin-project-assignments')">${icon('projects','')}<strong>Project Access</strong></button>
        <button class="admin-quick-action" onclick="navigate('admin-reference-data')">${icon('columns','')}<strong>Reference Lists</strong></button>
        <button class="admin-quick-action" onclick="navigate('admin-system-activity')">${icon('history','')}<strong>Login Audit</strong></button>
      </div>
    </div>
  </div>
  <div class="card admin-card"><div class="admin-card-head"><h3>Recent Login Events</h3><button class="btn sm" onclick="navigate('admin-system-activity')">Open Login Audit</button></div>
    <div class="table-scroll"><table><thead><tr><th>Timestamp</th><th>Username</th><th>Result</th><th>Reason</th><th>Source</th></tr></thead><tbody>${ADMIN_LOGIN_EVENTS.slice(0,5).map(event => `<tr><td class="mono">${event.time}</td><td class="mono">${event.username}</td><td>${statusBadge(event.result,event.result === 'Successful' ? 'success' : 'danger')}</td><td>${event.reason}</td><td class="mono">${event.source}</td></tr>`).join('')}</tbody></table></div>
  </div></div>`;
    }
